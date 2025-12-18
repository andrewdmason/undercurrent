"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { X, Mic, MicOff, Volume2, VolumeX, Captions, CaptionsOff, Settings2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  useRecordingCoachSettings,
  VOICE_OPTIONS,
  CoachVoice,
} from "@/hooks/use-recording-coach-settings";

interface RecordingCoachModalProps {
  ideaId: string;
  isOpen: boolean;
  onClose: () => void;
}

type ConnectionStatus = "idle" | "connecting" | "connected" | "error";

export function RecordingCoachModal({
  ideaId,
  isOpen,
  onClose,
}: RecordingCoachModalProps) {
  const {
    settings,
    isLoaded,
    setAudioEnabled,
    setSubtitlesEnabled,
    setSelectedVoice,
  } = useRecordingCoachSettings();

  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const dataChannelRef = useRef<RTCDataChannel | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  // State
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [currentSubtitle, setCurrentSubtitle] = useState<string>("");
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [hasPermissions, setHasPermissions] = useState(false);

  // Request media permissions and start camera preview
  const startMediaPreview = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      mediaStreamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      
      setHasPermissions(true);
      return stream;
    } catch (error) {
      console.error("Failed to get media permissions:", error);
      setErrorMessage("Please allow camera and microphone access to use the recording coach.");
      return null;
    }
  }, []);

  // Connect to OpenAI Realtime API
  const connectToRealtime = useCallback(async () => {
    if (!mediaStreamRef.current) {
      const stream = await startMediaPreview();
      if (!stream) return;
    }

    setConnectionStatus("connecting");
    setErrorMessage(null);

    try {
      // Get ephemeral token from our API
      const tokenResponse = await fetch("/api/recording-coach/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ideaId,
          voice: settings.selectedVoice,
        }),
      });

      if (!tokenResponse.ok) {
        throw new Error("Failed to create session");
      }

      const { clientSecret } = await tokenResponse.json();

      // Create peer connection
      const pc = new RTCPeerConnection();
      peerConnectionRef.current = pc;

      // Set up remote audio playback
      pc.ontrack = (event) => {
        if (audioRef.current) {
          audioRef.current.srcObject = event.streams[0];
        }
      };

      // Add local audio track (mic input)
      const audioTrack = mediaStreamRef.current?.getAudioTracks()[0];
      if (audioTrack) {
        pc.addTrack(audioTrack);
      }

      // Set up data channel for events
      const dataChannel = pc.createDataChannel("oai-events");
      dataChannelRef.current = dataChannel;

      dataChannel.addEventListener("open", () => {
        setConnectionStatus("connected");
        // Send initial greeting request
        sendClientEvent({
          type: "response.create",
          response: {
            modalities: ["text", "audio"],
            instructions: "Greet the user briefly and let them know you're ready to help them practice their talking points. Keep it to one sentence.",
          },
        });
      });

      dataChannel.addEventListener("message", (event) => {
        handleServerEvent(JSON.parse(event.data));
      });

      dataChannel.addEventListener("error", (error) => {
        console.error("Data channel error:", error);
        setErrorMessage("Connection error. Please try again.");
        setConnectionStatus("error");
      });

      // Create and send SDP offer
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      const sdpResponse = await fetch(
        `https://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-12-17`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${clientSecret}`,
            "Content-Type": "application/sdp",
          },
          body: offer.sdp,
        }
      );

      if (!sdpResponse.ok) {
        throw new Error("Failed to establish WebRTC connection");
      }

      const answerSdp = await sdpResponse.text();
      await pc.setRemoteDescription({ type: "answer", sdp: answerSdp });

    } catch (error) {
      console.error("Connection error:", error);
      setErrorMessage(error instanceof Error ? error.message : "Failed to connect");
      setConnectionStatus("error");
    }
  }, [ideaId, settings.selectedVoice, startMediaPreview]);

  // Send client event through data channel
  const sendClientEvent = useCallback((event: Record<string, unknown>) => {
    if (dataChannelRef.current?.readyState === "open") {
      dataChannelRef.current.send(JSON.stringify(event));
    }
  }, []);

  // Handle server events
  const handleServerEvent = useCallback((event: Record<string, unknown>) => {
    const eventType = event.type as string;

    switch (eventType) {
      case "response.audio_transcript.delta":
        // AI is speaking - accumulate transcript
        setCurrentSubtitle((prev) => prev + (event.delta as string || ""));
        setIsAiSpeaking(true);
        break;

      case "response.audio_transcript.done":
        // AI finished this transcript segment
        setIsAiSpeaking(false);
        // Clear subtitle after a delay
        setTimeout(() => setCurrentSubtitle(""), 3000);
        break;

      case "response.done":
        setIsAiSpeaking(false);
        break;

      case "input_audio_buffer.speech_started":
        // User started speaking - clear any lingering subtitle
        setCurrentSubtitle("");
        break;

      case "error":
        console.error("Server error:", event);
        setErrorMessage((event.error as { message?: string })?.message || "An error occurred");
        break;
    }
  }, []);

  // Handle "What's next?" button
  const handleNextPrompt = useCallback(() => {
    if (connectionStatus !== "connected") return;

    setCurrentSubtitle("");
    sendClientEvent({
      type: "response.create",
      response: {
        modalities: ["text", "audio"],
        instructions: "The user wants their next prompt. Based on what they've said so far and the talking points, give them a brief cue for what to say next. Be concise - one sentence max.",
      },
    });
  }, [connectionStatus, sendClientEvent]);

  // Toggle microphone
  const toggleMic = useCallback(() => {
    const audioTrack = mediaStreamRef.current?.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      setIsMicMuted(!audioTrack.enabled);
    }
  }, []);

  // Cleanup on unmount or close
  const cleanup = useCallback(() => {
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    if (dataChannelRef.current) {
      dataChannelRef.current.close();
      dataChannelRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    setConnectionStatus("idle");
    setCurrentSubtitle("");
    setHasPermissions(false);
  }, []);

  // Handle close
  const handleClose = useCallback(() => {
    cleanup();
    onClose();
  }, [cleanup, onClose]);

  // Initialize when modal opens
  useEffect(() => {
    if (isOpen && isLoaded) {
      startMediaPreview();
    }
    return () => {
      if (!isOpen) {
        cleanup();
      }
    };
  }, [isOpen, isLoaded, startMediaPreview, cleanup]);

  // Update audio element mute state based on settings
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.muted = !settings.audioEnabled;
    }
  }, [settings.audioEnabled]);

  // Handle voice change - need to reconnect
  const handleVoiceChange = useCallback((voice: CoachVoice) => {
    setSelectedVoice(voice);
    // If connected, we'd need to reconnect with new voice
    // For now, voice change takes effect on next connection
  }, [setSelectedVoice]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black">
      {/* Hidden audio element for AI voice playback */}
      <audio ref={audioRef} autoPlay />

      {/* Camera preview - fullscreen background */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="absolute inset-0 w-full h-full object-cover"
        style={{ transform: "scaleX(-1)" }} // Mirror the video
      />

      {/* Dark overlay for better contrast */}
      <div className="absolute inset-0 bg-black/30" />

      {/* Top bar with close and settings */}
      <div className="absolute top-0 left-0 right-0 p-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-white text-sm font-medium bg-black/50 px-3 py-1.5 rounded-full">
            Recording Coach
          </span>
          {connectionStatus === "connected" && (
            <span className="text-green-400 text-xs bg-black/50 px-2 py-1 rounded-full flex items-center gap-1">
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              Live
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Settings dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors">
                <Settings2 className="h-5 w-5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Voice</DropdownMenuLabel>
              {VOICE_OPTIONS.map((voice) => (
                <DropdownMenuItem
                  key={voice.value}
                  onClick={() => handleVoiceChange(voice.value)}
                  className="flex items-center justify-between"
                >
                  <div>
                    <span>{voice.label}</span>
                    <span className="text-xs text-[var(--grey-400)] ml-2">
                      {voice.description}
                    </span>
                  </div>
                  {settings.selectedVoice === voice.value && (
                    <span className="text-[var(--cyan-600)]">✓</span>
                  )}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuLabel>Display</DropdownMenuLabel>
              <DropdownMenuItem
                onClick={() => setAudioEnabled(!settings.audioEnabled)}
                className="flex items-center justify-between"
              >
                <span>AI Voice Audio</span>
                {settings.audioEnabled ? (
                  <Volume2 className="h-4 w-4" />
                ) : (
                  <VolumeX className="h-4 w-4 text-[var(--grey-400)]" />
                )}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setSubtitlesEnabled(!settings.subtitlesEnabled)}
                className="flex items-center justify-between"
              >
                <span>Subtitles</span>
                {settings.subtitlesEnabled ? (
                  <Captions className="h-4 w-4" />
                ) : (
                  <CaptionsOff className="h-4 w-4 text-[var(--grey-400)]" />
                )}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Close button */}
          <button
            onClick={handleClose}
            className="p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Subtitle overlay */}
      {settings.subtitlesEnabled && currentSubtitle && (
        <div className="absolute bottom-32 left-0 right-0 flex justify-center px-8">
          <div className="bg-black/80 text-white text-lg px-6 py-3 rounded-lg max-w-2xl text-center">
            {currentSubtitle}
          </div>
        </div>
      )}

      {/* Bottom controls */}
      <div className="absolute bottom-0 left-0 right-0 p-6">
        <div className="flex items-center justify-center gap-4">
          {/* Mic toggle */}
          <button
            onClick={toggleMic}
            disabled={!hasPermissions}
            className={cn(
              "p-4 rounded-full transition-colors",
              isMicMuted
                ? "bg-red-500/80 text-white"
                : "bg-white/20 text-white hover:bg-white/30"
            )}
          >
            {isMicMuted ? (
              <MicOff className="h-6 w-6" />
            ) : (
              <Mic className="h-6 w-6" />
            )}
          </button>

          {/* Main action button */}
          {connectionStatus === "idle" || connectionStatus === "error" ? (
            <Button
              size="lg"
              onClick={connectToRealtime}
              disabled={!hasPermissions}
              className="px-8 py-6 text-lg rounded-full bg-white text-black hover:bg-white/90"
            >
              Start Coaching Session
            </Button>
          ) : connectionStatus === "connecting" ? (
            <Button
              size="lg"
              disabled
              className="px-8 py-6 text-lg rounded-full bg-white/50 text-black"
            >
              <Loader2 className="h-5 w-5 mr-2 animate-spin" />
              Connecting...
            </Button>
          ) : (
            <Button
              size="lg"
              onClick={handleNextPrompt}
              disabled={isAiSpeaking}
              className={cn(
                "px-8 py-6 text-lg rounded-full transition-all",
                isAiSpeaking
                  ? "bg-white/50 text-black"
                  : "bg-white text-black hover:bg-white/90 hover:scale-105"
              )}
            >
              {isAiSpeaking ? "AI Speaking..." : "What's next?"}
            </Button>
          )}

          {/* Audio toggle */}
          <button
            onClick={() => setAudioEnabled(!settings.audioEnabled)}
            className={cn(
              "p-4 rounded-full transition-colors",
              !settings.audioEnabled
                ? "bg-white/20 text-white/50"
                : "bg-white/20 text-white hover:bg-white/30"
            )}
          >
            {settings.audioEnabled ? (
              <Volume2 className="h-6 w-6" />
            ) : (
              <VolumeX className="h-6 w-6" />
            )}
          </button>
        </div>

        {/* Error message */}
        {errorMessage && (
          <div className="mt-4 text-center">
            <span className="bg-red-500/80 text-white text-sm px-4 py-2 rounded-full">
              {errorMessage}
            </span>
          </div>
        )}

        {/* Permission prompt */}
        {!hasPermissions && !errorMessage && (
          <div className="mt-4 text-center">
            <span className="bg-black/50 text-white text-sm px-4 py-2 rounded-full">
              Waiting for camera and microphone access...
            </span>
          </div>
        )}
      </div>
    </div>
  );
}


