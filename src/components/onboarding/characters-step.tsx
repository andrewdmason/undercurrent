"use client";

import { useState, useRef, useEffect } from "react";
import { useOnboarding } from "./onboarding-context";
import { createCharacter, deleteCharacter, uploadCharacterImage } from "@/lib/actions/characters";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ArrowRight, ArrowLeft, Plus, Trash2, SkipForward, User, Sparkles, Upload, X, Video, Mic, ArrowLeftIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { ProjectCharacter } from "@/lib/types";
import { CreateAICharacterModal } from "@/components/strategy/create-ai-character-modal";
import { createClient } from "@/lib/supabase/client";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

type CharacterType = "human-camera" | "human-voiceover" | "ai-camera" | "ai-voiceover";

interface AICharacterData {
  name: string;
  description: string;
  imageUrl: string;
  isAiGenerated: boolean;
  aiStyle: string;
}

export function CharactersStep() {
  const { project, characters, setCharacters, addCharacter, goNext, goBack } = useOnboarding();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isAIModalOpen, setIsAIModalOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<CharacterType | null>(null);
  const [isVoiceoverOnly, setIsVoiceoverOnly] = useState(false);

  const handleOpenDialog = () => {
    setSelectedType(null);
    setIsVoiceoverOnly(false);
    setIsDialogOpen(true);
  };

  const handleTypeSelect = (type: CharacterType) => {
    setSelectedType(type);
    setIsVoiceoverOnly(type === "human-voiceover" || type === "ai-voiceover");

    // For AI on-camera, open the AI modal instead
    if (type === "ai-camera") {
      setIsDialogOpen(false);
      setIsAIModalOpen(true);
    }
  };

  const handleSaveCharacter = async (data: {
    name: string;
    description: string;
    pendingImage?: File;
    isMe?: boolean;
    memberId?: string;
  }) => {
    const result = await createCharacter(project.id, {
      name: data.name,
      description: data.description || null,
      image_url: null,
      is_ai_generated: selectedType === "ai-voiceover",
      is_voiceover_only: isVoiceoverOnly,
      ai_style: null,
      member_id: data.memberId || null,
    });

    if (result.success && result.character) {
      let newCharacter = result.character;

      // Upload image if there's a pending one
      if (data.pendingImage) {
        const formData = new FormData();
        formData.append("file", data.pendingImage);
        const uploadResult = await uploadCharacterImage(project.id, newCharacter.id, formData);
        if (uploadResult.success && uploadResult.imageUrl) {
          newCharacter = { ...newCharacter, image_url: uploadResult.imageUrl };
        }
      }

      addCharacter(newCharacter);
    }

    setIsDialogOpen(false);
    setSelectedType(null);
  };

  const handleDeleteCharacter = async (characterId: string) => {
    await deleteCharacter(characterId, project.id);
    setCharacters(characters.filter((c) => c.id !== characterId));
  };

  const handleAICharacterReady = async (data: AICharacterData) => {
    // Create the character in the database
    const result = await createCharacter(project.id, {
      name: data.name,
      description: data.description,
      image_url: data.imageUrl,
      is_ai_generated: data.isAiGenerated,
      is_voiceover_only: false, // AI camera characters are on-camera
      ai_style: data.aiStyle,
    });

    if (result.success && result.character) {
      addCharacter(result.character);
    }
  };

  const getCharacterBadge = (character: ProjectCharacter) => {
    if (character.is_ai_generated && character.is_voiceover_only) {
      return { label: "AI Voice", icon: Mic };
    }
    if (character.is_ai_generated) {
      return { label: "AI Avatar", icon: Sparkles };
    }
    if (character.is_voiceover_only) {
      return { label: "Voiceover", icon: Mic };
    }
    return null;
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="space-y-3">
        <h1 className="text-3xl sm:text-4xl font-semibold text-slate-900 tracking-tight">
          Who appears in your videos?
        </h1>
        <p className="text-lg text-slate-500">
          Add the people (or AI characters) who will be on camera or provide voiceover. The AI will tailor scripts to their personality.
        </p>
      </div>

      {/* Character list */}
      <div className="space-y-3">
        {characters.map((character) => {
          const badge = getCharacterBadge(character);
          return (
            <div
              key={character.id}
              className="flex items-center gap-4 p-4 bg-white rounded-xl border border-slate-200 group"
            >
              <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center overflow-hidden flex-shrink-0">
                {character.image_url ? (
                  <img
                    src={character.image_url}
                    alt={character.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User className="h-5 w-5 text-slate-400" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-base font-medium text-slate-800">{character.name}</span>
                {character.description && (
                  <p className="text-sm text-slate-400 mt-0.5 line-clamp-1">{character.description}</p>
                )}
                {badge && (
                  <span className="inline-flex items-center gap-1 text-xs text-violet-600 mt-1">
                    <badge.icon className="h-3 w-3" />
                    {badge.label}
                  </span>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDeleteCharacter(character.id)}
                className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 p-0 text-slate-400 hover:text-red-500"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          );
        })}

        {/* Add character button */}
        <Button
          variant="outline"
          onClick={handleOpenDialog}
          className="h-11"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add character
        </Button>

        {/* Empty state */}
        {characters.length === 0 && (
          <div className="text-center py-8 text-slate-400">
            No characters added yet. Add people who appear in your videos or provide voiceover.
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 pt-4">
        <Button variant="outline" onClick={goBack} className="h-11">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <Button onClick={goNext} className="h-11 px-6">
          {characters.length > 0 ? (
            <>
              Continue
              <ArrowRight className="ml-2 h-4 w-4" />
            </>
          ) : (
            <>
              Skip for now
              <SkipForward className="ml-2 h-4 w-4" />
            </>
          )}
        </Button>
      </div>

      {/* AI Character Modal (for on-camera AI) */}
      <CreateAICharacterModal
        projectId={project.id}
        open={isAIModalOpen}
        onOpenChange={setIsAIModalOpen}
        onCharacterReady={handleAICharacterReady}
      />

      {/* Add Character Dialog */}
      <AddCharacterDialog
        isOpen={isDialogOpen}
        onClose={() => {
          setIsDialogOpen(false);
          setSelectedType(null);
        }}
        selectedType={selectedType}
        onTypeSelect={handleTypeSelect}
        onSave={handleSaveCharacter}
        onBack={() => setSelectedType(null)}
        projectId={project.id}
      />
    </div>
  );
}

interface AddCharacterDialogProps {
  isOpen: boolean;
  onClose: () => void;
  selectedType: CharacterType | null;
  onTypeSelect: (type: CharacterType) => void;
  onSave: (data: {
    name: string;
    description: string;
    pendingImage?: File;
    isMe?: boolean;
    memberId?: string;
  }) => Promise<void>;
  onBack: () => void;
  projectId: string;
}

function AddCharacterDialog({
  isOpen,
  onClose,
  selectedType,
  onTypeSelect,
  onSave,
  onBack,
  projectId,
}: AddCharacterDialogProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [pendingImage, setPendingImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isMe, setIsMe] = useState(false);
  const [currentUserName, setCurrentUserName] = useState<string | null>(null);
  const [currentMemberId, setCurrentMemberId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch current user info and their project member ID
  useEffect(() => {
    async function fetchUserAndMembership() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Try to get name from metadata, fallback to email
        const userName = user.user_metadata?.full_name || user.email?.split("@")[0] || "";
        setCurrentUserName(userName);

        // Get the project member ID (not the auth user ID)
        const { data: member } = await supabase
          .from("project_members")
          .select("id")
          .eq("project_id", projectId)
          .eq("user_id", user.id)
          .single();

        if (member) {
          setCurrentMemberId(member.id);
        }
      }
    }
    fetchUserAndMembership();
  }, [projectId]);

  // Reset form when dialog opens/closes or type changes
  useEffect(() => {
    if (isOpen && !selectedType) {
      setName("");
      setDescription("");
      setPendingImage(null);
      setImagePreview(null);
      setImageError(null);
      setIsMe(false);
    }
  }, [isOpen, selectedType]);

  // Pre-fill name when "This is me" is checked
  useEffect(() => {
    if (isMe && currentUserName) {
      setName(currentUserName);
    }
  }, [isMe, currentUserName]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_FILE_SIZE) {
      setImageError(`Image must be less than 5MB. Your file is ${(file.size / (1024 * 1024)).toFixed(1)}MB.`);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      return;
    }

    setImageError(null);
    setPendingImage(file);

    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = () => {
    setPendingImage(null);
    setImagePreview(null);
    setImageError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async () => {
    if (!name.trim()) return;

    setIsSaving(true);
    await onSave({
      name: name.trim(),
      description: description.trim(),
      pendingImage: pendingImage || undefined,
      isMe,
      memberId: isMe ? currentMemberId || undefined : undefined,
    });
    setIsSaving(false);
  };

  const isHuman = selectedType === "human-camera" || selectedType === "human-voiceover";
  const showForm = selectedType === "human-camera" || selectedType === "human-voiceover" || selectedType === "ai-voiceover";

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[520px] rounded-xl">
        <DialogHeader className="px-4 min-h-8">
          <DialogTitle className="text-base font-semibold text-slate-800">
            {!selectedType ? "Add Character" : showForm ? "Character Details" : "Add Character"}
          </DialogTitle>
        </DialogHeader>

        {/* Step 1: Type Selection */}
        {!selectedType && (
          <div className="px-4 pb-4 space-y-4">
            <p className="text-sm text-slate-500">What type of character are you adding?</p>
            <div className="grid grid-cols-2 gap-3">
              <TypeCard
                title="Human"
                subtitle="On Camera"
                icon={<Video className="h-6 w-6" />}
                onClick={() => onTypeSelect("human-camera")}
              />
              <TypeCard
                title="Human"
                subtitle="Voiceover Only"
                icon={<Mic className="h-6 w-6" />}
                onClick={() => onTypeSelect("human-voiceover")}
              />
              <TypeCard
                title="AI Avatar"
                subtitle="On Camera"
                icon={<Sparkles className="h-6 w-6" />}
                onClick={() => onTypeSelect("ai-camera")}
                highlight
              />
              <TypeCard
                title="AI Voice"
                subtitle="Voiceover Only"
                icon={<Mic className="h-6 w-6" />}
                onClick={() => onTypeSelect("ai-voiceover")}
              />
            </div>
          </div>
        )}

        {/* Step 2: Character Form (for human or AI voiceover) */}
        {showForm && (
          <div className="space-y-4 px-4 pb-4">
            {/* Back button */}
            <button
              onClick={onBack}
              className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 transition-colors"
            >
              <ArrowLeftIcon className="h-4 w-4" />
              Back
            </button>

            {/* Image upload (not for voiceover-only AI) */}
            {selectedType !== "ai-voiceover" && (
              <>
                <div className="flex justify-center">
                  <div className="relative">
                    <div
                      className={cn(
                        "w-24 h-24 rounded-full bg-slate-100 flex items-center justify-center cursor-pointer hover:bg-slate-200 transition-all duration-150 overflow-hidden",
                        imageError && "ring-2 ring-red-500"
                      )}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      {imagePreview ? (
                        <img
                          src={imagePreview}
                          alt="Character"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="flex flex-col items-center gap-1 text-slate-400">
                          <Upload className="h-5 w-5" />
                          <span className="text-xs">Upload</span>
                        </div>
                      )}
                    </div>
                    {pendingImage && (
                      <button
                        onClick={handleRemoveImage}
                        className="absolute -top-1 -right-1 w-5 h-5 bg-slate-800 text-white rounded-full flex items-center justify-center hover:bg-slate-600 transition-colors"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </div>
                </div>

                {imageError && (
                  <p className="text-xs text-red-500 text-center">{imageError}</p>
                )}

                <p className="text-xs text-slate-400 text-center">
                  Click to upload an image (max 5MB)
                </p>
              </>
            )}

            {/* Name input */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-600">Name</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter name"
                autoFocus={!isHuman}
                className="h-10"
              />
            </div>

            {/* "This is me" checkbox for humans */}
            {isHuman && (
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="is-me"
                  checked={isMe}
                  onCheckedChange={(checked: boolean | "indeterminate") => setIsMe(checked === true)}
                  className="border-slate-300 data-[state=checked]:bg-violet-600 data-[state=checked]:border-violet-600"
                />
                <label
                  htmlFor="is-me"
                  className="text-sm text-slate-600 cursor-pointer"
                >
                  This is me
                </label>
              </div>
            )}

            {/* Description input - only for AI voiceover characters (human characters get description from interview) */}
            {selectedType === "ai-voiceover" && (
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-600">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe this AI voice's tone, style, and personality..."
                  rows={4}
                  className={cn(
                    "w-full rounded-lg border border-slate-200 bg-white px-3 py-2",
                    "text-sm text-slate-800 placeholder:text-slate-400",
                    "focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent",
                    "resize-none"
                  )}
                />
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="ghost"
                onClick={onClose}
                disabled={isSaving}
                className="h-10"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={!name.trim() || isSaving}
                className="h-10"
              >
                {isSaving ? "Saving..." : "Add Character"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

interface TypeCardProps {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  onClick: () => void;
  highlight?: boolean;
}

function TypeCard({ title, subtitle, icon, onClick, highlight }: TypeCardProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-col items-center gap-2 p-5 rounded-xl border-2 transition-all duration-200",
        highlight
          ? "border-violet-200 bg-violet-50 hover:border-violet-400 hover:bg-violet-100"
          : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50",
      )}
    >
      <div className={cn(
        "p-3 rounded-full",
        highlight ? "bg-violet-100 text-violet-600" : "bg-slate-100 text-slate-500"
      )}>
        {icon}
      </div>
      <div className="text-center">
        <div className={cn(
          "font-medium",
          highlight ? "text-violet-900" : "text-slate-800"
        )}>
          {title}
        </div>
        <div className={cn(
          "text-xs",
          highlight ? "text-violet-600" : "text-slate-500"
        )}>
          {subtitle}
        </div>
      </div>
    </button>
  );
}
