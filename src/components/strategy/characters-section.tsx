"use client";

import { useState, useRef, useEffect } from "react";
import { ProjectCharacter } from "@/lib/types";
import {
  createCharacter,
  updateCharacter,
  deleteCharacter,
  uploadCharacterImage,
} from "@/lib/actions/characters";
import { getTeamMembers, TeamMember } from "@/lib/actions/team";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Plus, Trash2, Upload, User, X, Sparkles, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { CreateAICharacterModal } from "./create-ai-character-modal";

// Simple markdown renderer for bullet points
function renderSimpleMarkdown(text: string) {
  const lines = text.split("\n");
  const result: React.ReactNode[] = [];
  let currentList: string[] = [];

  const flushList = () => {
    if (currentList.length > 0) {
      result.push(
        <ul key={result.length} className="list-disc list-inside space-y-0.5">
          {currentList.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      );
      currentList = [];
    }
  };

  lines.forEach((line, index) => {
    const bulletMatch = line.match(/^[\*\-]\s+(.+)$/);
    if (bulletMatch) {
      currentList.push(bulletMatch[1]);
    } else {
      flushList();
      if (line.trim()) {
        result.push(
          <p key={index} className={result.length > 0 ? "mt-1" : ""}>
            {line}
          </p>
        );
      }
    }
  });

  flushList();
  return result;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

interface CharactersSectionProps {
  projectId: string;
  characters: ProjectCharacter[];
}

interface AICharacterData {
  name: string;
  description: string;
  imageUrl: string;
  isAiGenerated: boolean;
  aiStyle: string;
}

export function CharactersSection({ projectId, characters }: CharactersSectionProps) {
  const [characterList, setCharacterList] = useState<ProjectCharacter[]>(characters);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCharacter, setEditingCharacter] = useState<ProjectCharacter | null>(null);
  const [isAIModalOpen, setIsAIModalOpen] = useState(false);
  const [aiCharacterData, setAiCharacterData] = useState<AICharacterData | null>(null);

  const handleOpenNew = () => {
    setEditingCharacter(null);
    setAiCharacterData(null);
    setIsDialogOpen(true);
  };

  const handleAICharacterReady = (data: AICharacterData) => {
    setAiCharacterData(data);
    setEditingCharacter(null);
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (character: ProjectCharacter) => {
    setEditingCharacter(character);
    setAiCharacterData(null);
    setIsDialogOpen(true);
  };

  const handleClose = () => {
    setIsDialogOpen(false);
    setEditingCharacter(null);
    setAiCharacterData(null);
  };

  const handleSave = async (data: { name: string; description: string; pendingImage?: File; isAiGenerated?: boolean; aiStyle?: string; imageUrl?: string; memberId?: string | null }) => {
    if (editingCharacter) {
      // Update existing character
      await updateCharacter(editingCharacter.id, projectId, {
        name: data.name,
        description: data.description,
        member_id: data.memberId,
      });
      
      // Upload image if there's a pending one
      if (data.pendingImage) {
        const formData = new FormData();
        formData.append("file", data.pendingImage);
        const result = await uploadCharacterImage(projectId, editingCharacter.id, formData);
        if (result.success && result.imageUrl) {
          setCharacterList(
            characterList.map((c) =>
              c.id === editingCharacter.id ? { ...c, ...data, member_id: data.memberId || null, image_url: result.imageUrl! } : c
            )
          );
        } else {
          setCharacterList(
            characterList.map((c) =>
              c.id === editingCharacter.id ? { ...c, ...data, member_id: data.memberId || null } : c
            )
          );
        }
      } else {
        setCharacterList(
          characterList.map((c) =>
            c.id === editingCharacter.id ? { ...c, ...data, member_id: data.memberId || null } : c
          )
        );
      }
    } else {
      // Create new character
      const result = await createCharacter(projectId, {
        name: data.name,
        description: data.description,
        image_url: data.imageUrl || null,
        is_ai_generated: data.isAiGenerated || false,
        ai_style: data.aiStyle || null,
        member_id: data.memberId || null,
      });
      if (result.success && result.character) {
        let newCharacter = result.character;
        
        // Upload image if there's a pending one (for non-AI characters)
        if (data.pendingImage && !data.imageUrl) {
          const formData = new FormData();
          formData.append("file", data.pendingImage);
          const uploadResult = await uploadCharacterImage(projectId, newCharacter.id, formData);
          if (uploadResult.success && uploadResult.imageUrl) {
            newCharacter = { ...newCharacter, image_url: uploadResult.imageUrl };
          }
        }
        
        setCharacterList([...characterList, newCharacter]);
      }
    }
    handleClose();
  };

  const handleDelete = async (characterId: string) => {
    await deleteCharacter(characterId, projectId);
    setCharacterList(characterList.filter((c) => c.id !== characterId));
  };

  return (
    <div className="rounded-lg border border-[var(--border)] bg-white p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm font-semibold text-[var(--grey-800)]">
            Characters
          </h2>
          <p className="text-xs text-[var(--grey-400)] mt-0.5">
            People (or AI avatars) that appear in your videos
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={() => setIsAIModalOpen(true)}
            className="h-8 text-xs bg-violet-600 hover:bg-violet-700 text-white"
          >
            <Sparkles size={14} className="mr-1" />
            Create AI Character
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleOpenNew}
            className="h-8 text-xs"
          >
            <Plus size={14} className="mr-1" />
            Add Character
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        {characterList.map((c) => (
          <CharacterCard
            key={c.id}
            character={c}
            onEdit={() => handleOpenEdit(c)}
            onDelete={() => handleDelete(c.id)}
          />
        ))}

        {characterList.length === 0 && (
          <div className="text-center py-8 text-[var(--grey-400)] text-sm">
            No characters added yet. Add people (or AI avatars) that appear in your videos.
          </div>
        )}
      </div>

      <CharacterDialog
        projectId={projectId}
        isOpen={isDialogOpen}
        onClose={handleClose}
        onSave={handleSave}
        character={editingCharacter}
        existingImageUrl={editingCharacter?.image_url || aiCharacterData?.imageUrl}
        initialData={aiCharacterData}
      />

      <CreateAICharacterModal
        projectId={projectId}
        open={isAIModalOpen}
        onOpenChange={setIsAIModalOpen}
        onCharacterReady={handleAICharacterReady}
      />
    </div>
  );
}

interface CharacterCardProps {
  character: ProjectCharacter;
  onEdit: () => void;
  onDelete: () => void;
}

function CharacterCard({ character, onEdit, onDelete }: CharacterCardProps) {
  return (
    <div 
      className="rounded-lg border border-[var(--border)] bg-[var(--grey-50)] p-4 group cursor-pointer hover:border-[var(--grey-200)] transition-colors"
      onClick={onEdit}
    >
      <div className="flex gap-4">
        <div className="w-16 h-16 rounded-lg bg-black/[0.03] flex items-center justify-center overflow-hidden flex-shrink-0">
          {character.image_url ? (
            <img
              src={character.image_url}
              alt={character.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <User size={24} className="text-[var(--grey-400)]" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="font-medium text-sm text-[var(--grey-800)]">
            {character.name}
          </div>
          {character.description && (
            <div className="text-xs text-[var(--grey-400)] mt-1">
              {renderSimpleMarkdown(character.description)}
            </div>
          )}
        </div>

        <div className="flex items-start gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="h-7 w-7 p-0 text-[var(--grey-400)] hover:text-[#f72736]"
          >
            <Trash2 size={14} />
          </Button>
        </div>
      </div>
    </div>
  );
}

interface CharacterDialogProps {
  projectId: string;
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: { name: string; description: string; pendingImage?: File; isAiGenerated?: boolean; aiStyle?: string; imageUrl?: string; memberId?: string | null }) => Promise<void>;
  character: ProjectCharacter | null;
  existingImageUrl?: string | null;
  initialData?: AICharacterData | null;
}

function CharacterDialog({ projectId, isOpen, onClose, onSave, character, existingImageUrl, initialData }: CharacterDialogProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [pendingImage, setPendingImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [showMemberPicker, setShowMemberPicker] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch team members when dialog opens
  useEffect(() => {
    if (isOpen) {
      getTeamMembers(projectId).then((result) => {
        if (result.members) {
          setTeamMembers(result.members);
        }
      });
    }
  }, [isOpen, projectId]);

  // Reset form when dialog opens/closes or character changes
  useEffect(() => {
    if (isOpen) {
      // Use initial data from AI flow if available
      if (initialData) {
        setName(initialData.name || "");
        setDescription(initialData.description || "");
        setSelectedMemberId(null);
      } else {
        setName(character?.name || "");
        setDescription(character?.description || "");
        setSelectedMemberId(character?.member_id || null);
      }
      setPendingImage(null);
      setImagePreview(null);
      setImageError(null);
      setShowMemberPicker(false);
    }
  }, [isOpen, character, initialData]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      setImageError(`Image must be less than 5MB. Your file is ${(file.size / (1024 * 1024)).toFixed(1)}MB.`);
      // Reset the input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      return;
    }

    setImageError(null);
    setPendingImage(file);

    // Create preview
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
      isAiGenerated: initialData?.isAiGenerated,
      aiStyle: initialData?.aiStyle,
      imageUrl: initialData?.imageUrl,
      memberId: selectedMemberId,
    });
    setIsSaving(false);
  };

  const selectedMember = teamMembers.find((m) => m.id === selectedMemberId);

  const displayImage = imagePreview || existingImageUrl;
  const isEditing = !!character;
  const isFromAI = !!initialData;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[520px] rounded-lg">
        <DialogHeader className="px-4 min-h-8">
          <DialogTitle className="text-xs font-semibold text-[var(--grey-800)]">
            {isEditing ? "Edit Character" : isFromAI ? "Save AI Character" : "Add Character"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 px-4 pb-4">
          {/* Image upload */}
          <div className="flex justify-center">
            <div className="relative">
              <div
                className={cn(
                  "w-24 h-24 rounded-full bg-black/[0.03] flex items-center justify-center cursor-pointer hover:bg-black/[0.05] transition-all duration-150 overflow-hidden",
                  imageError && "ring-2 ring-[#f72736]"
                )}
                onClick={() => fileInputRef.current?.click()}
              >
                {displayImage ? (
                  <img
                    src={displayImage}
                    alt="Character"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="flex flex-col items-center gap-1 text-[var(--grey-400)]">
                    <Upload size={20} />
                    <span className="text-[11px]">Upload</span>
                  </div>
                )}
              </div>
              {(pendingImage || imagePreview) && (
                <button
                  onClick={handleRemoveImage}
                  className="absolute -top-1 -right-1 w-5 h-5 bg-[var(--grey-800)] text-white rounded-full flex items-center justify-center hover:bg-[var(--grey-600)] transition-colors"
                >
                  <X size={12} />
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
            <p className="text-[11px] text-[#f72736] text-center">{imageError}</p>
          )}

          <p className="text-[11px] text-[var(--grey-400)] text-center">
            Click to upload an image (max 5MB)
          </p>

          {/* Name input */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[var(--grey-600)]">Name</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter name"
              autoFocus
              className="h-8 rounded-lg bg-black/[0.03] border-0 text-xs focus-visible:ring-2 focus-visible:ring-[#007bc2]"
            />
          </div>

          {/* Description input */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[var(--grey-600)]">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe this character's role, personality, and on-camera strengths..."
              rows={5}
              className={cn(
                "w-full rounded-lg bg-black/[0.03] border-0 px-3 py-2",
                "text-xs text-[var(--grey-800)] placeholder:text-[var(--grey-400)]",
                "focus:outline-none focus:ring-2 focus:ring-[#007bc2]",
                "resize-none"
              )}
            />
          </div>

          {/* Team Member (optional) */}
          {teamMembers.length > 0 && (
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[var(--grey-600)]">
                Team Member <span className="text-[var(--grey-400)] font-normal">(optional)</span>
              </label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowMemberPicker(!showMemberPicker)}
                  className="w-full flex items-center justify-between h-8 px-3 rounded-lg bg-black/[0.03] text-xs text-left hover:bg-black/[0.05] transition-colors"
                >
                  <span className={selectedMember ? "text-[var(--grey-800)]" : "text-[var(--grey-400)]"}>
                    {selectedMember ? selectedMember.full_name || "Unnamed Member" : "Select team member..."}
                  </span>
                  <ChevronDown
                    size={14}
                    className={cn(
                      "text-[var(--grey-400)] transition-transform",
                      showMemberPicker && "rotate-180"
                    )}
                  />
                </button>

                {showMemberPicker && (
                  <div className="absolute z-10 top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-lg border border-[var(--border)] py-1 max-h-48 overflow-y-auto">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedMemberId(null);
                        setShowMemberPicker(false);
                      }}
                      className={cn(
                        "w-full px-3 py-2 text-xs text-left hover:bg-[var(--grey-50)] transition-colors",
                        !selectedMemberId && "bg-[var(--grey-50)]"
                      )}
                    >
                      <span className="text-[var(--grey-400)]">None</span>
                    </button>
                    {teamMembers.map((member) => (
                      <button
                        key={member.id}
                        type="button"
                        onClick={() => {
                          setSelectedMemberId(member.id);
                          setShowMemberPicker(false);
                        }}
                        className={cn(
                          "w-full px-3 py-2 text-xs text-left hover:bg-[var(--grey-50)] transition-colors",
                          selectedMemberId === member.id && "bg-[var(--grey-50)]"
                        )}
                      >
                        {member.full_name || "Unnamed Member"}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <p className="text-[10px] text-[var(--grey-400)]">
                Link this character to a team member for task assignment
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              disabled={isSaving}
              className="h-8 text-xs"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSubmit}
              disabled={!name.trim() || isSaving}
              className="h-8 text-xs"
            >
              {isSaving ? "Saving..." : isEditing ? "Save Changes" : "Add Character"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
