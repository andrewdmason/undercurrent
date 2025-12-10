"use client";

import { useState, useEffect, useCallback } from "react";
import { Sparkles, Loader2, RefreshCw, ChevronDown, Check } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { VISUAL_STYLES, getStyleThumbnailPath } from "@/lib/visual-styles";

interface AIConcept {
  title: string;
  description: string;
  visualDescription: string;
  suggestedStyle: string;
  suggestedName: string;
}

interface GeneratedCharacter {
  imageUrl: string;
  styleSlug: string;
  styleName: string;
  name: string;
  description: string;
  visualDescription: string;
}

interface CreateAICharacterModalProps {
  projectId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCharacterReady: (data: {
    name: string;
    description: string;
    imageUrl: string;
    isAiGenerated: boolean;
    aiStyle: string;
  }) => void;
}

type Step = "concept" | "generating" | "refine";

export function CreateAICharacterModal({
  projectId,
  open,
  onOpenChange,
  onCharacterReady,
}: CreateAICharacterModalProps) {
  // Step state
  const [step, setStep] = useState<Step>("concept");

  // Concept selection state
  const [concepts, setConcepts] = useState<AIConcept[]>([]);
  const [isLoadingConcepts, setIsLoadingConcepts] = useState(false);
  const [selectedConcept, setSelectedConcept] = useState<AIConcept | null>(null);
  const [customDescription, setCustomDescription] = useState("");
  const [useCustom, setUseCustom] = useState(false);

  // Image generation state
  const [generatedCharacter, setGeneratedCharacter] = useState<GeneratedCharacter | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);

  // Refinement state
  const [selectedStyle, setSelectedStyle] = useState<string>("");
  const [additionalNotes, setAdditionalNotes] = useState("");
  const [showStylePicker, setShowStylePicker] = useState(false);

  // Fetch concepts
  const fetchConcepts = useCallback(async (force = false) => {
    if (!open || (!force && concepts.length > 0)) return;

    setIsLoadingConcepts(true);
    setConcepts([]); // Clear existing concepts when forcing refresh
    setSelectedConcept(null);
    
    try {
      const response = await fetch("/api/ai-character/suggest-concepts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId }),
      });

      if (!response.ok) {
        throw new Error("Failed to fetch concepts");
      }

      const reader = response.body?.getReader();
      if (!reader) return;

      const decoder = new TextDecoder();
      let buffer = ""; // Buffer for incomplete lines across chunks

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        // Prepend any buffered incomplete line from previous chunk
        const chunk = buffer + decoder.decode(value);
        const lines = chunk.split("\n");
        
        // If chunk doesn't end with newline, last element is incomplete - save for next iteration
        if (!chunk.endsWith("\n")) {
          buffer = lines.pop() || "";
        } else {
          buffer = "";
        }

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data === "[DONE]") continue;

            try {
              const parsed = JSON.parse(data);
              if (parsed.type === "complete" && parsed.concepts) {
                // Handle both array and object responses
                const conceptsArray = Array.isArray(parsed.concepts)
                  ? parsed.concepts
                  : parsed.concepts.concepts || [];
                setConcepts(conceptsArray);
              }
            } catch {
              // Ignore parse errors for partial chunks
            }
          }
        }
      }
    } catch (error) {
      console.error("Error fetching concepts:", error);
    } finally {
      setIsLoadingConcepts(false);
    }
  }, [projectId, open, concepts.length]);

  useEffect(() => {
    if (open) {
      fetchConcepts();
    }
  }, [open, fetchConcepts]);

  // Reset state when modal closes
  useEffect(() => {
    if (!open) {
      const timer = setTimeout(() => {
        setStep("concept");
        setConcepts([]);
        setSelectedConcept(null);
        setCustomDescription("");
        setUseCustom(false);
        setGeneratedCharacter(null);
        setIsGenerating(false);
        setGenerationError(null);
        setSelectedStyle("");
        setAdditionalNotes("");
        setShowStylePicker(false);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [open]);

  // Generate image
  const generateImage = async () => {
    const concept = useCustom
      ? {
          visualDescription: customDescription,
          suggestedStyle: "digital-illustration", // Default style for custom
          suggestedName: "AI Character",
          description: customDescription,
        }
      : selectedConcept;

    if (!concept) return;

    setStep("generating");
    setIsGenerating(true);
    setGenerationError(null);

    const styleToUse = selectedStyle || concept.suggestedStyle;

    try {
      const response = await fetch("/api/ai-character/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          characterDescription: concept.visualDescription,
          styleSlug: styleToUse,
          additionalNotes: additionalNotes || undefined,
        }),
      });

      const result = await response.json();

      if (!response.ok || result.error) {
        throw new Error(result.error || "Failed to generate image");
      }

      setGeneratedCharacter({
        imageUrl: result.imageUrl,
        styleSlug: result.styleSlug,
        styleName: result.styleName,
        name: concept.suggestedName,
        description: concept.description,
        visualDescription: concept.visualDescription,
      });
      setSelectedStyle(result.styleSlug);
      setStep("refine");
    } catch (error) {
      console.error("Error generating image:", error);
      setGenerationError(
        error instanceof Error ? error.message : "Failed to generate image"
      );
      setStep("concept");
    } finally {
      setIsGenerating(false);
    }
  };

  // Regenerate image
  const regenerateImage = async () => {
    if (!generatedCharacter) return;

    setIsGenerating(true);
    setGenerationError(null);

    try {
      const response = await fetch("/api/ai-character/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          characterDescription: generatedCharacter.visualDescription,
          styleSlug: selectedStyle,
          additionalNotes: additionalNotes || undefined,
          // Pass previous image for context when refining
          previousImageUrl: additionalNotes ? generatedCharacter.imageUrl : undefined,
        }),
      });

      const result = await response.json();

      if (!response.ok || result.error) {
        throw new Error(result.error || "Failed to generate image");
      }

      setGeneratedCharacter({
        ...generatedCharacter,
        imageUrl: result.imageUrl,
        styleSlug: result.styleSlug,
        styleName: result.styleName,
      });
      setAdditionalNotes(""); // Clear notes after regeneration
    } catch (error) {
      console.error("Error regenerating image:", error);
      setGenerationError(
        error instanceof Error ? error.message : "Failed to regenerate image"
      );
    } finally {
      setIsGenerating(false);
    }
  };

  // Approve and proceed to character form
  const approveCharacter = () => {
    if (!generatedCharacter) return;

    onCharacterReady({
      name: generatedCharacter.name,
      description: generatedCharacter.description,
      imageUrl: generatedCharacter.imageUrl,
      isAiGenerated: true,
      aiStyle: generatedCharacter.styleSlug,
    });
    onOpenChange(false);
  };

  const hasSelection = useCustom ? customDescription.trim().length > 0 : !!selectedConcept;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        {step === "concept" && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-violet-100">
                  <Sparkles className="h-4 w-4 text-violet-600" />
                </div>
                Create AI Character
              </DialogTitle>
              <DialogDescription className="text-left">
                Let&apos;s find a creative way to use AI avatars that feels authentic to your brand.
              </DialogDescription>
            </DialogHeader>

            <div className="py-2 space-y-4">
              {/* AI Concepts */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs text-[var(--grey-400)]">
                  <Sparkles className="h-3 w-3" />
                  <span>Suggested concepts</span>
                </div>

                {isLoadingConcepts ? (
                  <div className="space-y-2">
                    {[1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className="h-16 rounded-lg bg-[var(--grey-50)] animate-pulse"
                      />
                    ))}
                  </div>
                ) : concepts.length > 0 ? (
                  <div className="space-y-2">
                    {concepts.map((concept, index) => (
                      <label
                        key={index}
                        className={cn(
                          "flex items-start gap-3 cursor-pointer rounded-lg px-3 py-3 transition-colors border",
                          selectedConcept === concept && !useCustom
                            ? "bg-violet-50 border-violet-200"
                            : "bg-[var(--grey-50)] border-transparent hover:border-[var(--grey-200)]"
                        )}
                        onClick={() => {
                          setSelectedConcept(concept);
                          setUseCustom(false);
                        }}
                      >
                        <input
                          type="radio"
                          name="concept"
                          checked={selectedConcept === concept && !useCustom}
                          onChange={() => {
                            setSelectedConcept(concept);
                            setUseCustom(false);
                          }}
                          className="mt-1 h-4 w-4 text-violet-600 focus:ring-violet-500"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-[var(--grey-800)]">
                            {concept.title}
                          </p>
                          <p className="text-xs text-[var(--grey-400)] mt-0.5">
                            {concept.description}
                          </p>
                        </div>
                      </label>
                    ))}
                    
                    {/* More ideas button */}
                    <button
                      type="button"
                      onClick={() => fetchConcepts(true)}
                      className="w-full flex items-center justify-center gap-1.5 py-2 text-xs text-violet-600 hover:text-violet-700 hover:bg-violet-50 rounded-lg transition-colors"
                    >
                      <RefreshCw className="h-3 w-3" />
                      Generate more ideas
                    </button>
                  </div>
                ) : (
                  <p className="text-xs text-[var(--grey-400)]">
                    No suggestions available. Describe your own concept below.
                  </p>
                )}
              </div>

              {/* Custom description */}
              <div className="space-y-2">
                <label
                  className={cn(
                    "flex items-start gap-3 cursor-pointer rounded-lg px-3 py-3 transition-colors border",
                    useCustom
                      ? "bg-violet-50 border-violet-200"
                      : "bg-[var(--grey-50)] border-transparent"
                  )}
                  onClick={() => setUseCustom(true)}
                >
                  <input
                    type="radio"
                    name="concept"
                    checked={useCustom}
                    onChange={() => setUseCustom(true)}
                    className="mt-1 h-4 w-4 text-violet-600 focus:ring-violet-500"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[var(--grey-800)]">
                      Describe your own
                    </p>
                  </div>
                </label>

                {useCustom && (
                  <Textarea
                    placeholder="Describe the AI character you have in mind..."
                    value={customDescription}
                    onChange={(e) => setCustomDescription(e.target.value)}
                    className="min-h-[80px] resize-none"
                    autoFocus
                  />
                )}
              </div>

              {generationError && (
                <p className="text-sm text-[#f72736]">{generationError}</p>
              )}
            </div>

            <DialogFooter className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                onClick={generateImage}
                disabled={!hasSelection}
                className="bg-violet-600 hover:bg-violet-700 text-white"
              >
                Generate Character
              </Button>
            </DialogFooter>
          </>
        )}

        {step === "generating" && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-violet-100">
                  <Loader2 className="h-4 w-4 text-violet-600 animate-spin" />
                </div>
                Generating Character
              </DialogTitle>
              <DialogDescription className="text-left">
                Creating your AI character image. This may take a moment...
              </DialogDescription>
            </DialogHeader>

            <div className="py-8 flex justify-center">
              <div className="w-64 h-64 rounded-lg bg-[var(--grey-50)] animate-pulse flex items-center justify-center">
                <Loader2 className="h-8 w-8 text-[var(--grey-300)] animate-spin" />
              </div>
            </div>
          </>
        )}

        {step === "refine" && generatedCharacter && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-violet-100">
                  <Sparkles className="h-4 w-4 text-violet-600" />
                </div>
                Your AI Character
              </DialogTitle>
              <DialogDescription className="text-left">
                Here&apos;s your generated character. You can regenerate with different styles or notes.
              </DialogDescription>
            </DialogHeader>

            <div className="py-4 space-y-4">
              {/* Generated image */}
              <div className="flex justify-center">
                <div className="relative">
                  <img
                    src={generatedCharacter.imageUrl}
                    alt="Generated AI character"
                    className="w-64 h-64 rounded-lg object-cover shadow-md"
                  />
                  {isGenerating && (
                    <div className="absolute inset-0 bg-white/80 rounded-lg flex items-center justify-center">
                      <Loader2 className="h-8 w-8 text-violet-600 animate-spin" />
                    </div>
                  )}
                </div>
              </div>

              {/* Style picker */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-[var(--grey-600)]">
                  Visual Style
                </label>
                <button
                  type="button"
                  onClick={() => setShowStylePicker(!showStylePicker)}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-[var(--grey-50)] border border-[var(--grey-100)] hover:border-[var(--grey-200)] transition-colors"
                >
                  <span className="text-sm text-[var(--grey-800)]">
                    {VISUAL_STYLES.find((s) => s.slug === selectedStyle)?.name ||
                      "Select a style"}
                  </span>
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 text-[var(--grey-400)] transition-transform",
                      showStylePicker && "rotate-180"
                    )}
                  />
                </button>

                {showStylePicker && (
                  <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto p-2 rounded-lg bg-[var(--grey-50)] border border-[var(--grey-100)]">
                    {VISUAL_STYLES.map((style) => (
                      <button
                        key={style.slug}
                        type="button"
                        onClick={() => {
                          setSelectedStyle(style.slug);
                          setShowStylePicker(false);
                        }}
                        className={cn(
                          "relative flex flex-col items-center p-2 rounded-lg transition-colors",
                          selectedStyle === style.slug
                            ? "bg-violet-100 ring-2 ring-violet-500"
                            : "hover:bg-white"
                        )}
                      >
                        <div className="w-full aspect-square rounded bg-[var(--grey-100)] mb-1 overflow-hidden">
                          <img
                            src={getStyleThumbnailPath(style.slug)}
                            alt={style.name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              // Hide broken image, show placeholder
                              e.currentTarget.style.display = "none";
                            }}
                          />
                        </div>
                        <span className="text-[10px] text-[var(--grey-600)] text-center leading-tight">
                          {style.name}
                        </span>
                        {selectedStyle === style.slug && (
                          <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-violet-500 flex items-center justify-center">
                            <Check className="h-2.5 w-2.5 text-white" />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Additional notes for regeneration */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-[var(--grey-600)]">
                  Refinement notes (optional)
                </label>
                <Textarea
                  placeholder="Add notes for regeneration, e.g., 'make them look friendlier' or 'add glasses'..."
                  value={additionalNotes}
                  onChange={(e) => setAdditionalNotes(e.target.value)}
                  className="min-h-[60px] resize-none text-sm"
                />
              </div>

              {generationError && (
                <p className="text-sm text-[#f72736]">{generationError}</p>
              )}
            </div>

            <DialogFooter className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={regenerateImage}
                disabled={isGenerating}
              >
                <RefreshCw
                  className={cn("h-4 w-4 mr-1", isGenerating && "animate-spin")}
                />
                Regenerate
              </Button>
              <Button
                onClick={approveCharacter}
                disabled={isGenerating}
                className="bg-violet-600 hover:bg-violet-700 text-white"
              >
                Use This Character
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

