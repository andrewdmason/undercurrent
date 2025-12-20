"use client";

import { useState, useEffect, useRef } from "react";
import { useOnboarding } from "./onboarding-context";
import { updateCharacter as updateCharacterAction } from "@/lib/actions/characters";
import { Button } from "@/components/ui/button";
import { ArrowRight, ArrowLeft, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  CameraComfort,
  ScriptStyle,
  FilmingLocation,
  Equipment,
  MovementCapability,
  RecordingSetup,
  OnCameraInterviewData,
  VoiceoverInterviewData,
} from "@/lib/types";

// Question option types
interface QuestionOption<T> {
  value: T;
  label: string;
  emoji: string;
  description?: string;
}

// Question configurations
const CAMERA_COMFORT_OPTIONS: QuestionOption<CameraComfort>[] = [
  { value: "new", label: "New to this", emoji: "🌱", description: "Gets nervous, needs multiple takes" },
  { value: "comfortable", label: "Getting comfortable", emoji: "📹", description: "Can do it, but prefers shorter segments" },
  { value: "natural", label: "Natural on camera", emoji: "⭐", description: "Confident, can handle longer takes" },
];

const SCRIPT_STYLE_OPTIONS: QuestionOption<ScriptStyle>[] = [
  { value: "word_for_word", label: "Word-for-word script", emoji: "📝", description: "Reads from teleprompter or memorizes" },
  { value: "bullet_points", label: "Bullet points", emoji: "📋", description: "Prefers key points to riff on naturally" },
  { value: "improviser", label: "Improviser", emoji: "🎤", description: "Give me the topic, I'll figure it out" },
];

const LOCATION_OPTIONS: QuestionOption<FilmingLocation>[] = [
  { value: "home", label: "Home office or living space", emoji: "🏠" },
  { value: "workplace", label: "Workplace", emoji: "🏢", description: "Office, store, workshop, etc." },
  { value: "on_location", label: "On location", emoji: "🌳", description: "Outdoors, customer sites, events" },
  { value: "studio", label: "Dedicated studio setup", emoji: "🎬" },
];

const EQUIPMENT_OPTIONS: QuestionOption<Equipment>[] = [
  { value: "smartphone", label: "Smartphone", emoji: "📱", description: "Phone camera, natural lighting" },
  { value: "webcam", label: "Webcam", emoji: "💻", description: "Laptop/desktop camera for talking head" },
  { value: "dedicated_camera", label: "Dedicated camera", emoji: "📷", description: "DSLR, mirrorless, or camcorder" },
  { value: "full_production", label: "Full production", emoji: "🎙️", description: "Pro camera, lighting, external audio" },
];

const MOVEMENT_OPTIONS: QuestionOption<MovementCapability>[] = [
  { value: "seated", label: "Seated/stationary", emoji: "🪑", description: "Talking head at desk or standing in place" },
  { value: "walk_and_talk", label: "Walk-and-talk", emoji: "🚶", description: "Can move while speaking" },
  { value: "action_shots", label: "Action shots", emoji: "🎬", description: "Demonstrations, physical activities" },
  { value: "on_the_go", label: "On-the-go", emoji: "🚗", description: "Comfortable filming in varied environments" },
];

const RECORDING_SETUP_OPTIONS: QuestionOption<RecordingSetup>[] = [
  { value: "phone_mic", label: "Phone/computer mic", emoji: "📱", description: "Built-in microphone, casual quality" },
  { value: "usb_mic", label: "USB microphone", emoji: "🎧", description: "Decent quality home setup (Blue Yeti, etc.)" },
  { value: "professional", label: "Professional setup", emoji: "🎙️", description: "Treated room, XLR mic, or studio access" },
];

// Single-select option card component
function OptionCard<T extends string>({
  option,
  isSelected,
  onSelect,
}: {
  option: QuestionOption<T>;
  isSelected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      className={cn(
        "w-full p-4 rounded-xl border-2 text-left transition-all",
        "hover:border-violet-300 hover:bg-violet-50/50",
        isSelected
          ? "border-violet-500 bg-violet-50"
          : "border-slate-200 bg-white"
      )}
    >
      <div className="flex items-start gap-3">
        <span className="text-2xl">{option.emoji}</span>
        <div>
          <div className="font-medium text-slate-900">{option.label}</div>
          {option.description && (
            <div className="text-sm text-slate-500 mt-0.5">{option.description}</div>
          )}
        </div>
      </div>
    </button>
  );
}

// Multi-select option card component
function MultiOptionCard<T extends string>({
  option,
  isSelected,
  onToggle,
}: {
  option: QuestionOption<T>;
  isSelected: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      className={cn(
        "w-full p-4 rounded-xl border-2 text-left transition-all",
        "hover:border-violet-300 hover:bg-violet-50/50",
        isSelected
          ? "border-violet-500 bg-violet-50"
          : "border-slate-200 bg-white"
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "w-5 h-5 rounded border-2 flex items-center justify-center mt-0.5 transition-colors",
            isSelected
              ? "border-violet-500 bg-violet-500"
              : "border-slate-300"
          )}
        >
          {isSelected && (
            <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
          )}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-xl">{option.emoji}</span>
            <span className="font-medium text-slate-900">{option.label}</span>
          </div>
          {option.description && (
            <div className="text-sm text-slate-500 mt-0.5 ml-7">{option.description}</div>
          )}
        </div>
      </div>
    </button>
  );
}

export function CharacterInterviewStep() {
  const { project, characters, updateCharacter, goNext, goBack } = useOnboarding();

  // Filter to only human characters (not AI-generated)
  const humanCharacters = characters.filter((c) => !c.is_ai_generated);

  // State for current character index and question index
  const [currentCharacterIndex, setCurrentCharacterIndex] = useState(0);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const hasAutoAdvanced = useRef(false);

  // Get current character
  const currentCharacter = humanCharacters[currentCharacterIndex];
  const isVoiceoverOnly = currentCharacter?.is_voiceover_only ?? false;

  // State for answers (separate for on-camera and voiceover)
  const [cameraComfort, setCameraComfort] = useState<CameraComfort | null>(null);
  const [scriptStyles, setScriptStyles] = useState<ScriptStyle[]>([]);
  const [locations, setLocations] = useState<FilmingLocation[]>([]);
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [movement, setMovement] = useState<MovementCapability[]>([]);
  const [recordingSetup, setRecordingSetup] = useState<RecordingSetup | null>(null);

  // Calculate total questions based on character type
  const totalQuestions = isVoiceoverOnly ? 2 : 5;

  // Auto-advance if no human characters
  useEffect(() => {
    if (humanCharacters.length === 0 && !hasAutoAdvanced.current) {
      hasAutoAdvanced.current = true;
      goNext();
    }
  }, [humanCharacters.length, goNext]);

  // Load existing interview data when character changes
  useEffect(() => {
    if (currentCharacter?.interview_data) {
      const data = currentCharacter.interview_data;
      if ("cameraComfort" in data) {
        // On-camera character
        const onCameraData = data as OnCameraInterviewData;
        setCameraComfort(onCameraData.cameraComfort);
        setScriptStyles(onCameraData.scriptStyles || []);
        setLocations(onCameraData.locations || []);
        setEquipment(onCameraData.equipment || []);
        setMovement(onCameraData.movement || []);
      } else {
        // Voiceover character
        const voiceoverData = data as VoiceoverInterviewData;
        setScriptStyles(voiceoverData.scriptStyles || []);
        setRecordingSetup(voiceoverData.recordingSetup);
      }
    } else {
      // Reset all answers for new character
      setCameraComfort(null);
      setScriptStyles([]);
      setLocations([]);
      setEquipment([]);
      setMovement([]);
      setRecordingSetup(null);
    }
    setCurrentQuestionIndex(0);
  }, [currentCharacter]);

  // If no human characters, don't render anything (auto-advance will handle it)
  if (humanCharacters.length === 0) {
    return null;
  }

  // Check if current question is answered
  const isCurrentQuestionAnswered = () => {
    if (isVoiceoverOnly) {
      switch (currentQuestionIndex) {
        case 0: return scriptStyles.length > 0;
        case 1: return recordingSetup !== null;
        default: return true;
      }
    } else {
      switch (currentQuestionIndex) {
        case 0: return cameraComfort !== null;
        case 1: return scriptStyles.length > 0;
        case 2: return locations.length > 0;
        case 3: return equipment.length > 0;
        case 4: return movement.length > 0;
        default: return true;
      }
    }
  };

  // Save interview data to database
  const saveInterviewData = async () => {
    if (!currentCharacter) return;

    setIsSaving(true);

    // Build interview data based on character type
    const interviewData = isVoiceoverOnly
      ? { scriptStyles, recordingSetup: recordingSetup! }
      : {
          cameraComfort: cameraComfort!,
          scriptStyles,
          locations,
          equipment,
          movement,
        };

    try {
      // Save interview data to database
      await updateCharacterAction(currentCharacter.id, project.id, {
        interview_data: interviewData,
      });

      // Update local state with interview data
      updateCharacter(currentCharacter.id, {
        interview_data: interviewData,
      });
    } catch (error) {
      console.error("Failed to save interview data:", error);
    } finally {
      setIsSaving(false);
    }
  };

  // Handle next question or next character
  const handleNext = async () => {
    if (currentQuestionIndex < totalQuestions - 1) {
      // Go to next question
      setCurrentQuestionIndex((prev) => prev + 1);
    } else {
      // Last question - save interview data and move to next character
      await saveInterviewData();

      if (currentCharacterIndex < humanCharacters.length - 1) {
        // Move to next character
        setCurrentCharacterIndex((prev) => prev + 1);
        setCurrentQuestionIndex(0);
      } else {
        // All characters done - go to next step
        goNext();
      }
    }
  };

  // Handle back
  const handleBack = () => {
    if (currentQuestionIndex > 0) {
      // Go to previous question
      setCurrentQuestionIndex((prev) => prev - 1);
    } else if (currentCharacterIndex > 0) {
      // Go to previous character's last question
      setCurrentCharacterIndex((prev) => prev - 1);
      const prevCharacter = humanCharacters[currentCharacterIndex - 1];
      const prevTotalQuestions = prevCharacter.is_voiceover_only ? 2 : 5;
      setCurrentQuestionIndex(prevTotalQuestions - 1);
    } else {
      // Go back to characters step
      goBack();
    }
  };

  // Toggle multi-select value
  const toggleMultiSelect = <T extends string>(
    value: T,
    current: T[],
    setter: React.Dispatch<React.SetStateAction<T[]>>
  ) => {
    if (current.includes(value)) {
      setter(current.filter((v) => v !== value));
    } else {
      setter([...current, value]);
    }
  };

  // Render question content
  const renderQuestion = () => {
    if (isVoiceoverOnly) {
      // Voiceover questions
      switch (currentQuestionIndex) {
        case 0:
          return (
            <div className="space-y-3">
              {SCRIPT_STYLE_OPTIONS.map((option) => (
                <MultiOptionCard
                  key={option.value}
                  option={option}
                  isSelected={scriptStyles.includes(option.value)}
                  onToggle={() => toggleMultiSelect(option.value, scriptStyles, setScriptStyles)}
                />
              ))}
            </div>
          );
        case 1:
          return (
            <div className="space-y-3">
              {RECORDING_SETUP_OPTIONS.map((option) => (
                <OptionCard
                  key={option.value}
                  option={option}
                  isSelected={recordingSetup === option.value}
                  onSelect={() => setRecordingSetup(option.value)}
                />
              ))}
            </div>
          );
      }
    } else {
      // On-camera questions
      switch (currentQuestionIndex) {
        case 0:
          return (
            <div className="space-y-3">
              {CAMERA_COMFORT_OPTIONS.map((option) => (
                <OptionCard
                  key={option.value}
                  option={option}
                  isSelected={cameraComfort === option.value}
                  onSelect={() => setCameraComfort(option.value)}
                />
              ))}
            </div>
          );
        case 1:
          return (
            <div className="space-y-3">
              {SCRIPT_STYLE_OPTIONS.map((option) => (
                <MultiOptionCard
                  key={option.value}
                  option={option}
                  isSelected={scriptStyles.includes(option.value)}
                  onToggle={() => toggleMultiSelect(option.value, scriptStyles, setScriptStyles)}
                />
              ))}
            </div>
          );
        case 2:
          return (
            <div className="space-y-3">
              {LOCATION_OPTIONS.map((option) => (
                <MultiOptionCard
                  key={option.value}
                  option={option}
                  isSelected={locations.includes(option.value)}
                  onToggle={() => toggleMultiSelect(option.value, locations, setLocations)}
                />
              ))}
            </div>
          );
        case 3:
          return (
            <div className="space-y-3">
              {EQUIPMENT_OPTIONS.map((option) => (
                <MultiOptionCard
                  key={option.value}
                  option={option}
                  isSelected={equipment.includes(option.value)}
                  onToggle={() => toggleMultiSelect(option.value, equipment, setEquipment)}
                />
              ))}
            </div>
          );
        case 4:
          return (
            <div className="space-y-3">
              {MOVEMENT_OPTIONS.map((option) => (
                <MultiOptionCard
                  key={option.value}
                  option={option}
                  isSelected={movement.includes(option.value)}
                  onToggle={() => toggleMultiSelect(option.value, movement, setMovement)}
                />
              ))}
            </div>
          );
      }
    }
  };

  // Get question title
  const getQuestionTitle = () => {
    const name = currentCharacter?.name || "this character";
    if (isVoiceoverOnly) {
      switch (currentQuestionIndex) {
        case 0: return `How does ${name} prefer to deliver lines?`;
        case 1: return `How will ${name} record their voiceover?`;
      }
    } else {
      switch (currentQuestionIndex) {
        case 0: return `How comfortable is ${name} on camera?`;
        case 1: return `How does ${name} prefer to deliver lines?`;
        case 2: return `Where will ${name} usually film?`;
        case 3: return `What's ${name}'s typical recording setup?`;
        case 4: return `What filming styles can ${name} do?`;
      }
    }
    return "";
  };

  // Get question subtitle for multi-select
  const getQuestionSubtitle = () => {
    if (isVoiceoverOnly) {
      // Voiceover: script styles is question 0
      if (currentQuestionIndex === 0) {
        return "Select all that apply";
      }
    } else {
      // On-camera: script styles is question 1, locations is 2, equipment is 3, movement is 4
      if (currentQuestionIndex === 1 || currentQuestionIndex === 2 || currentQuestionIndex === 3 || currentQuestionIndex === 4) {
        return "Select all that apply";
      }
    }
    return null;
  };

  const isLastQuestion = currentQuestionIndex === totalQuestions - 1;
  const isLastCharacter = currentCharacterIndex === humanCharacters.length - 1;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Character indicator */}
      <div className="flex items-center gap-3">
        {currentCharacter?.image_url ? (
          <img
            src={currentCharacter.image_url}
            alt={currentCharacter.name}
            className="w-12 h-12 rounded-full object-cover"
          />
        ) : (
          <div className="w-12 h-12 rounded-full bg-slate-200 flex items-center justify-center">
            <span className="text-xl text-slate-500">
              {currentCharacter?.name.charAt(0).toUpperCase()}
            </span>
          </div>
        )}
        <div>
          <div className="font-medium text-slate-900">{currentCharacter?.name}</div>
          <div className="text-sm text-slate-500">
            {isVoiceoverOnly ? "Voiceover only" : "On camera"} • Question {currentQuestionIndex + 1} of {totalQuestions}
            {humanCharacters.length > 1 && (
              <span> • Character {currentCharacterIndex + 1} of {humanCharacters.length}</span>
            )}
          </div>
        </div>
      </div>

      {/* Question */}
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold text-slate-900 tracking-tight">
          {getQuestionTitle()}
        </h1>
        {getQuestionSubtitle() && (
          <p className="text-slate-500">{getQuestionSubtitle()}</p>
        )}
      </div>

      {/* Options */}
      {renderQuestion()}

      {/* Actions */}
      <div className="flex items-center gap-3 pt-4">
        <Button
          variant="outline"
          onClick={handleBack}
          className="h-11"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <Button
          onClick={handleNext}
          disabled={!isCurrentQuestionAnswered() || isSaving}
          className="bg-slate-900 hover:bg-slate-800 text-white h-11 px-5"
        >
          {isSaving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : isLastQuestion ? (
            isLastCharacter ? (
              "Complete & Continue"
            ) : (
              "Next Character"
            )
          ) : (
            <>
              Continue
              <ArrowRight className="ml-2 h-4 w-4" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
