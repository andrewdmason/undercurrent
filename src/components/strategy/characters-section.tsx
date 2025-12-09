"use client";

import { useState, useRef, useEffect } from "react";
import { ProjectCharacter } from "@/lib/types";
import {
  createCharacter,
  updateCharacter,
  deleteCharacter,
  uploadCharacterImage,
} from "@/lib/actions/characters";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Plus, Trash2, Upload, User, X } from "lucide-react";
import { cn } from "@/lib/utils";

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

export function CharactersSection({ projectId, characters }: CharactersSectionProps) {
  const [characterList, setCharacterList] = useState<ProjectCharacter[]>(characters);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCharacter, setEditingCharacter] = useState<ProjectCharacter | null>(null);

  const handleOpenNew = () => {
    setEditingCharacter(null);
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (character: ProjectCharacter) => {
    setEditingCharacter(character);
    setIsDialogOpen(true);
  };

  const handleClose = () => {
    setIsDialogOpen(false);
    setEditingCharacter(null);
  };

  const handleSave = async (data: { name: string; description: string; pendingImage?: File }) => {
    if (editingCharacter) {
      // Update existing character
      await updateCharacter(editingCharacter.id, projectId, data);
      
      // Upload image if there's a pending one
      if (data.pendingImage) {
        const formData = new FormData();
        formData.append("file", data.pendingImage);
        const result = await uploadCharacterImage(projectId, editingCharacter.id, formData);
        if (result.success && result.imageUrl) {
          setCharacterList(
            characterList.map((c) =>
              c.id === editingCharacter.id ? { ...c, ...data, image_url: result.imageUrl! } : c
            )
          );
        } else {
          setCharacterList(
            characterList.map((c) =>
              c.id === editingCharacter.id ? { ...c, ...data } : c
            )
          );
        }
      } else {
        setCharacterList(
          characterList.map((c) =>
            c.id === editingCharacter.id ? { ...c, ...data } : c
          )
        );
      }
    } else {
      // Create new character
      const result = await createCharacter(projectId, data);
      if (result.success && result.character) {
        let newCharacter = result.character;
        
        // Upload image if there's a pending one
        if (data.pendingImage) {
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
        isOpen={isDialogOpen}
        onClose={handleClose}
        onSave={handleSave}
        character={editingCharacter}
        existingImageUrl={editingCharacter?.image_url}
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
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: { name: string; description: string; pendingImage?: File }) => Promise<void>;
  character: ProjectCharacter | null;
  existingImageUrl?: string | null;
}

function CharacterDialog({ isOpen, onClose, onSave, character, existingImageUrl }: CharacterDialogProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [pendingImage, setPendingImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset form when dialog opens/closes or character changes
  useEffect(() => {
    if (isOpen) {
      setName(character?.name || "");
      setDescription(character?.description || "");
      setPendingImage(null);
      setImagePreview(null);
      setImageError(null);
    }
  }, [isOpen, character]);

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
    });
    setIsSaving(false);
  };

  const displayImage = imagePreview || existingImageUrl;
  const isEditing = !!character;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[520px] rounded-lg">
        <DialogHeader className="px-4 min-h-8">
          <DialogTitle className="text-xs font-semibold text-[var(--grey-800)]">
            {isEditing ? "Edit Character" : "Add Character"}
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
