"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import { ImageIcon, Link2, Upload, X, Check, Plus, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { IdeaAssetReferenceImage, ProjectImage } from "@/lib/types";
import { cn } from "@/lib/utils";

interface AssetReferenceImagesProps {
  referenceImages: IdeaAssetReferenceImage[];
  projectImages: ProjectImage[];
  assetId: string;
  onLinkImage: (referenceImageId: string, projectImageId: string) => Promise<void>;
  onUnlinkImage: (referenceImageId: string) => Promise<void>;
  onUploadImage: (referenceImageId: string, file: File) => Promise<void>;
  onDeleteImage: (referenceImageId: string) => Promise<void>;
  onAddImage: (description: string, projectImageId?: string) => Promise<void>;
}

export function AssetReferenceImages({
  referenceImages,
  projectImages,
  assetId,
  onLinkImage,
  onUnlinkImage,
  onUploadImage,
  onDeleteImage,
  onAddImage,
}: AssetReferenceImagesProps) {
  const [linkModalOpen, setLinkModalOpen] = useState(false);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [selectedRefImageId, setSelectedRefImageId] = useState<string | null>(null);
  const [isLinking, setIsLinking] = useState(false);
  const [isUploading, setIsUploading] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [newDescription, setNewDescription] = useState("");
  const [selectedProjectImageForAdd, setSelectedProjectImageForAdd] = useState<string | null>(null);
  const fileInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});

  // Count matched vs unmatched
  const matchedCount = referenceImages.filter(r => r.project_image_id || r.uploaded_url).length;
  const totalCount = referenceImages.length;

  const handleOpenLinkModal = (refImageId: string) => {
    setSelectedRefImageId(refImageId);
    setLinkModalOpen(true);
  };

  const handleLinkImage = async (projectImageId: string) => {
    if (!selectedRefImageId) return;
    
    setIsLinking(true);
    try {
      await onLinkImage(selectedRefImageId, projectImageId);
      setLinkModalOpen(false);
    } finally {
      setIsLinking(false);
    }
  };

  const handleUnlink = async (refImageId: string) => {
    await onUnlinkImage(refImageId);
  };

  const handleDelete = async (refImageId: string) => {
    setIsDeleting(refImageId);
    try {
      await onDeleteImage(refImageId);
    } finally {
      setIsDeleting(null);
    }
  };

  const handleFileSelect = async (refImageId: string, file: File) => {
    setIsUploading(refImageId);
    try {
      await onUploadImage(refImageId, file);
    } finally {
      setIsUploading(null);
    }
  };

  const handleAddImage = async () => {
    if (!newDescription.trim()) return;
    
    setIsAdding(true);
    try {
      await onAddImage(newDescription.trim(), selectedProjectImageForAdd || undefined);
      setAddModalOpen(false);
      setNewDescription("");
      setSelectedProjectImageForAdd(null);
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-3">
        <h5 className="text-xs font-semibold text-[var(--grey-500)] uppercase tracking-wider">
          Reference Images
        </h5>
        <div className="flex items-center gap-2">
          {totalCount > 0 && (
            <span className="text-xs text-[var(--grey-400)]">
              {matchedCount} of {totalCount} linked
            </span>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setAddModalOpen(true)}
            className="h-6 px-2 text-xs gap-1"
          >
            <Plus className="h-3 w-3" />
            Add
          </Button>
        </div>
      </div>
      
      {referenceImages.length === 0 ? (
        <div className="border-2 border-dashed border-[var(--grey-200)] rounded-lg p-6 text-center">
          <ImageIcon className="h-8 w-8 text-[var(--grey-300)] mx-auto mb-2" />
          <p className="text-sm text-[var(--grey-500)] mb-1">No reference images yet</p>
          <p className="text-xs text-[var(--grey-400)] mb-3">
            Add reference images to help the AI generate accurate visuals.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAddModalOpen(true)}
            className="gap-1"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Reference Image
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {referenceImages.map((refImage) => {
            const imageUrl = refImage.project_image?.image_url || refImage.uploaded_url;
            const hasImage = !!imageUrl;
            const isCurrentlyUploading = isUploading === refImage.id;
            const isCurrentlyDeleting = isDeleting === refImage.id;
            
            return (
              <div
                key={refImage.id}
                className={cn(
                  "relative rounded-lg overflow-hidden",
                  hasImage 
                    ? "bg-[var(--grey-100)]" 
                    : "border-2 border-dashed border-[var(--grey-200)] bg-[var(--grey-50)]"
                )}
              >
                {/* Hidden file input for each reference image */}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  ref={(el) => { fileInputRefs.current[refImage.id] = el; }}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      handleFileSelect(refImage.id, file);
                      e.target.value = ""; // Reset input
                    }
                  }}
                />

                {hasImage ? (
                  // Has image - show it with hover actions
                  <div className="group relative aspect-[4/3]">
                    <Image
                      src={imageUrl!}
                      alt={refImage.description}
                      fill
                      className="object-cover"
                    />
                    {/* Hover overlay with actions */}
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleOpenLinkModal(refImage.id)}
                        className="h-7 px-2 text-xs"
                      >
                        <Link2 className="h-3.5 w-3.5 mr-1" />
                        Change
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleUnlink(refImage.id)}
                        className="h-7 px-2 text-xs"
                      >
                        <X className="h-3.5 w-3.5 mr-1" />
                        Unlink
                      </Button>
                    </div>
                    {/* Delete button in corner */}
                    <button
                      onClick={() => handleDelete(refImage.id)}
                      disabled={isCurrentlyDeleting}
                      className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 hover:bg-red-600 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      {isCurrentlyDeleting ? (
                        <Loader2 className="h-3 w-3 text-white animate-spin" />
                      ) : (
                        <Trash2 className="h-3 w-3 text-white" />
                      )}
                    </button>
                    {/* Description overlay at bottom */}
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                      <p className="text-xs text-white line-clamp-2">
                        {refImage.description}
                      </p>
                    </div>
                  </div>
                ) : (
                  // No image - show empty state with actions
                  <div className="aspect-[4/3] flex flex-col items-center justify-center p-3 text-center relative group">
                    {isCurrentlyUploading ? (
                      <>
                        <Loader2 className="h-6 w-6 text-[var(--grey-400)] animate-spin mb-2" />
                        <p className="text-xs text-[var(--grey-500)]">Uploading...</p>
                      </>
                    ) : (
                      <>
                        <ImageIcon className="h-6 w-6 text-[var(--grey-300)] mb-2" />
                        <p className="text-xs text-[var(--grey-600)] line-clamp-2 mb-3">
                          {refImage.description}
                        </p>
                        <div className="flex gap-2">
                          {projectImages.length > 0 && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenLinkModal(refImage.id)}
                              className="h-6 px-2 text-[10px]"
                            >
                              <Link2 className="h-3 w-3 mr-1" />
                              Link
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => fileInputRefs.current[refImage.id]?.click()}
                            className="h-6 px-2 text-[10px]"
                          >
                            <Upload className="h-3 w-3 mr-1" />
                            Upload
                          </Button>
                        </div>
                      </>
                    )}
                    {/* Delete button in corner */}
                    <button
                      onClick={() => handleDelete(refImage.id)}
                      disabled={isCurrentlyDeleting}
                      className="absolute top-1 right-1 w-6 h-6 rounded-full bg-[var(--grey-200)] hover:bg-red-100 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      {isCurrentlyDeleting ? (
                        <Loader2 className="h-3 w-3 text-[var(--grey-500)] animate-spin" />
                      ) : (
                        <Trash2 className="h-3 w-3 text-[var(--grey-500)] hover:text-red-600" />
                      )}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Link Image Modal */}
      <Dialog open={linkModalOpen} onOpenChange={setLinkModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Link Reference Image</DialogTitle>
          </DialogHeader>
          <div className="mt-2">
            <p className="text-sm text-[var(--grey-500)] mb-4">
              Select a project image to use as reference:
            </p>
            {projectImages.length === 0 ? (
              <div className="text-center py-8">
                <ImageIcon className="h-8 w-8 text-[var(--grey-300)] mx-auto mb-2" />
                <p className="text-sm text-[var(--grey-500)]">
                  No project images available
                </p>
                <p className="text-xs text-[var(--grey-400)] mt-1">
                  Upload images in the Creative Brief to use them here
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2 max-h-[300px] overflow-y-auto">
                {projectImages.map((img) => {
                  const selectedRef = referenceImages.find(r => r.id === selectedRefImageId);
                  const isCurrentlyLinked = selectedRef?.project_image_id === img.id;
                  
                  return (
                    <button
                      key={img.id}
                      onClick={() => handleLinkImage(img.id)}
                      disabled={isLinking}
                      className={cn(
                        "relative aspect-square rounded-lg overflow-hidden border-2 transition-all",
                        isCurrentlyLinked
                          ? "border-[#00975a] ring-2 ring-[#00975a]/20"
                          : "border-transparent hover:border-[var(--grey-300)]"
                      )}
                    >
                      <Image
                        src={img.image_url}
                        alt={img.title || "Project image"}
                        fill
                        className="object-cover"
                      />
                      {isCurrentlyLinked && (
                        <div className="absolute top-1 right-1 w-5 h-5 rounded-full bg-[#00975a] flex items-center justify-center">
                          <Check className="h-3 w-3 text-white" />
                        </div>
                      )}
                      {img.title && (
                        <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-1.5 py-1">
                          <p className="text-[10px] text-white truncate">
                            {img.title}
                          </p>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Reference Image Modal */}
      <Dialog open={addModalOpen} onOpenChange={setAddModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Reference Image</DialogTitle>
          </DialogHeader>
          <div className="mt-2 space-y-4">
            <div>
              <label className="text-sm font-medium text-[var(--grey-700)] mb-1.5 block">
                Description
              </label>
              <Input
                placeholder="What should this reference image show?"
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                className="w-full"
              />
              <p className="text-xs text-[var(--grey-400)] mt-1">
                e.g., &quot;Photo of the game shelves&quot; or &quot;Interior of the space&quot;
              </p>
            </div>

            {projectImages.length > 0 && (
              <div>
                <label className="text-sm font-medium text-[var(--grey-700)] mb-1.5 block">
                  Link to project image (optional)
                </label>
                <div className="grid grid-cols-4 gap-2 max-h-[200px] overflow-y-auto">
                  {projectImages.map((img) => (
                    <button
                      key={img.id}
                      onClick={() => setSelectedProjectImageForAdd(
                        selectedProjectImageForAdd === img.id ? null : img.id
                      )}
                      className={cn(
                        "relative aspect-square rounded-lg overflow-hidden border-2 transition-all",
                        selectedProjectImageForAdd === img.id
                          ? "border-[#00975a] ring-2 ring-[#00975a]/20"
                          : "border-transparent hover:border-[var(--grey-300)]"
                      )}
                    >
                      <Image
                        src={img.image_url}
                        alt={img.title || "Project image"}
                        fill
                        className="object-cover"
                      />
                      {selectedProjectImageForAdd === img.id && (
                        <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-[#00975a] flex items-center justify-center">
                          <Check className="h-2.5 w-2.5 text-white" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => {
                  setAddModalOpen(false);
                  setNewDescription("");
                  setSelectedProjectImageForAdd(null);
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleAddImage}
                disabled={!newDescription.trim() || isAdding}
              >
                {isAdding ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Plus className="h-4 w-4 mr-2" />
                )}
                Add Reference Image
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}


