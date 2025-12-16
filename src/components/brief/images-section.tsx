"use client";

import { useState, useRef } from "react";
import { ProjectImage } from "@/lib/types";
import {
  uploadProjectImage,
  updateProjectImage,
  deleteProjectImage,
} from "@/lib/actions/images";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Plus, Trash2, ImageIcon, X, Loader2, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

interface ImagesSectionProps {
  projectId: string;
  images: ProjectImage[];
}

export function ImagesSection({ projectId, images }: ImagesSectionProps) {
  const [imageList, setImageList] = useState<ProjectImage[]>(images);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [editingImage, setEditingImage] = useState<ProjectImage | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset the input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }

    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      setUploadError(`Image must be less than 5MB. Your file is ${(file.size / (1024 * 1024)).toFixed(1)}MB.`);
      return;
    }

    setUploadError(null);
    setIsUploading(true);

    const formData = new FormData();
    formData.append("file", file);

    const result = await uploadProjectImage(projectId, formData);

    setIsUploading(false);

    if (result.error) {
      setUploadError(result.error);
    } else if (result.image) {
      setImageList([result.image, ...imageList]);
    }
  };

  const handleEdit = (image: ProjectImage) => {
    setEditingImage(image);
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingImage(null);
  };

  const handleSave = async (data: { title: string; description: string }) => {
    if (!editingImage) return;

    await updateProjectImage(editingImage.id, projectId, {
      title: data.title || null,
      description: data.description || null,
    });

    setImageList(
      imageList.map((img) =>
        img.id === editingImage.id
          ? { ...img, title: data.title || null, description: data.description || null }
          : img
      )
    );

    handleCloseDialog();
  };

  const handleDelete = async (imageId: string) => {
    await deleteProjectImage(imageId, projectId);
    setImageList(imageList.filter((img) => img.id !== imageId));
  };

  return (
    <div className="rounded-lg border border-[var(--border)] bg-white p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm font-semibold text-[var(--grey-800)]">
            Images
          </h2>
          <p className="text-xs text-[var(--grey-400)] mt-0.5">
            Reference images for locations, set pieces, and objects to use in b-roll
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="h-8 text-xs"
          >
            {isUploading ? (
              <>
                <Loader2 size={14} className="mr-1 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Plus size={14} className="mr-1" />
                Add Image
              </>
            )}
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>
      </div>

      {uploadError && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200">
          <p className="text-xs text-red-600">{uploadError}</p>
          <button
            onClick={() => setUploadError(null)}
            className="text-xs text-red-500 underline mt-1"
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {imageList.map((img) => (
          <ImageCard
            key={img.id}
            image={img}
            onEdit={() => handleEdit(img)}
            onDelete={() => handleDelete(img.id)}
          />
        ))}

        {/* Upload placeholder card */}
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className={cn(
            "aspect-[4/3] rounded-lg border-2 border-dashed border-[var(--grey-200)] bg-[var(--grey-25)]",
            "flex flex-col items-center justify-center gap-2",
            "hover:border-[var(--grey-300)] hover:bg-[var(--grey-50)] transition-colors",
            "cursor-pointer",
            isUploading && "opacity-50 cursor-not-allowed"
          )}
        >
          {isUploading ? (
            <Loader2 size={24} className="text-[var(--grey-400)] animate-spin" />
          ) : (
            <>
              <ImageIcon size={24} className="text-[var(--grey-400)]" />
              <span className="text-xs text-[var(--grey-400)]">Upload Image</span>
              <span className="text-[10px] text-[var(--grey-300)]">Max 5MB</span>
            </>
          )}
        </button>
      </div>

      {imageList.length === 0 && (
        <p className="text-center py-4 text-[var(--grey-400)] text-xs">
          No images uploaded yet. Add reference images for your video production.
        </p>
      )}

      <ImageEditDialog
        isOpen={isDialogOpen}
        onClose={handleCloseDialog}
        onSave={handleSave}
        image={editingImage}
      />
    </div>
  );
}

interface ImageCardProps {
  image: ProjectImage;
  onEdit: () => void;
  onDelete: () => void;
}

function ImageCard({ image, onEdit, onDelete }: ImageCardProps) {
  return (
    <div className="group relative rounded-lg border border-[var(--border)] bg-[var(--grey-50)] overflow-hidden">
      {/* Image */}
      <div
        className="aspect-[4/3] cursor-pointer"
        onClick={onEdit}
      >
        <img
          src={image.image_url}
          alt={image.title || "Reference image"}
          className="w-full h-full object-cover"
        />
      </div>

      {/* Overlay actions */}
      <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={onEdit}
          className="p-1.5 bg-white/90 rounded-md hover:bg-white transition-colors shadow-sm"
        >
          <Pencil size={12} className="text-[var(--grey-600)]" />
        </button>
        <button
          onClick={onDelete}
          className="p-1.5 bg-white/90 rounded-md hover:bg-white transition-colors shadow-sm"
        >
          <Trash2 size={12} className="text-[#f72736]" />
        </button>
      </div>

      {/* Info */}
      <div className="p-3" onClick={onEdit}>
        <h3 className="text-xs font-medium text-[var(--grey-800)] truncate cursor-pointer">
          {image.title || "Untitled"}
        </h3>
        {image.description && (
          <p className="text-[11px] text-[var(--grey-400)] mt-0.5 line-clamp-2 cursor-pointer">
            {image.description}
          </p>
        )}
      </div>
    </div>
  );
}

interface ImageEditDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: { title: string; description: string }) => Promise<void>;
  image: ProjectImage | null;
}

function ImageEditDialog({ isOpen, onClose, onSave, image }: ImageEditDialogProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Reset form when dialog opens/closes
  useState(() => {
    if (isOpen && image) {
      setTitle(image.title || "");
      setDescription(image.description || "");
    }
  });

  // Update form when image changes
  if (isOpen && image && title === "" && description === "" && (image.title || image.description)) {
    setTitle(image.title || "");
    setDescription(image.description || "");
  }

  const handleSubmit = async () => {
    setIsSaving(true);
    await onSave({
      title: title.trim(),
      description: description.trim(),
    });
    setIsSaving(false);
    setTitle("");
    setDescription("");
  };

  const handleClose = () => {
    setTitle("");
    setDescription("");
    onClose();
  };

  if (!image) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-[520px] rounded-lg">
        <DialogHeader className="px-4 min-h-8">
          <DialogTitle className="text-xs font-semibold text-[var(--grey-800)]">
            Edit Image Details
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 px-4 pb-4">
          {/* Image preview */}
          <div className="flex justify-center">
            <div className="w-full max-w-[280px] aspect-[4/3] rounded-lg overflow-hidden bg-[var(--grey-100)]">
              <img
                src={image.image_url}
                alt={image.title || "Reference image"}
                className="w-full h-full object-cover"
              />
            </div>
          </div>

          {/* Title input */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[var(--grey-600)]">Title</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter a title for this image"
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
              placeholder="Describe what this image shows and how it might be used..."
              rows={4}
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
              onClick={handleClose}
              disabled={isSaving}
              className="h-8 text-xs"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSubmit}
              disabled={isSaving}
              className="h-8 text-xs"
            >
              {isSaving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

