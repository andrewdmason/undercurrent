"use client";

import { useState } from "react";
import { ProjectTemplateWithChannels, DistributionChannel } from "@/lib/types";
import { deleteTemplate } from "@/lib/actions/templates";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Video } from "lucide-react";
import { cn } from "@/lib/utils";
import { CreateTemplateModal } from "./create-template-modal";
import { PlatformIcon, getPlatformLabel } from "./platform-icon";

interface TemplatesSectionProps {
  projectId: string;
  templates: ProjectTemplateWithChannels[];
  channels: DistributionChannel[];
}

export function TemplatesSection({
  projectId,
  templates: initialTemplates,
  channels,
}: TemplatesSectionProps) {
  const [templates, setTemplates] = useState<ProjectTemplateWithChannels[]>(initialTemplates);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<ProjectTemplateWithChannels | null>(null);

  const handleDeleteTemplate = async (templateId: string) => {
    await deleteTemplate(templateId);
    setTemplates(templates.filter((t) => t.id !== templateId));
  };

  const handleTemplateCreated = (template: ProjectTemplateWithChannels) => {
    setTemplates([template, ...templates]);
  };

  const handleTemplateUpdated = (template: ProjectTemplateWithChannels) => {
    setTemplates(templates.map((t) => (t.id === template.id ? template : t)));
  };

  const handleOpenCreate = () => {
    setEditingTemplate(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (template: ProjectTemplateWithChannels) => {
    setEditingTemplate(template);
    setIsModalOpen(true);
  };

  const handleModalClose = (open: boolean) => {
    setIsModalOpen(open);
    if (!open) {
      setEditingTemplate(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-[var(--border)] bg-white p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-semibold text-[var(--grey-800)]">
              Templates
            </h2>
            <p className="text-xs text-[var(--grey-400)] mt-0.5">
              Production styles for your video ideas
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleOpenCreate}
            className="h-8 text-xs"
          >
            <Plus size={14} className="mr-1" />
            Add Template
          </Button>
        </div>

        <div className="space-y-3">
          {templates.map((template) => (
            <TemplateCard
              key={template.id}
              template={template}
              onEdit={() => handleOpenEdit(template)}
              onDelete={() => handleDeleteTemplate(template.id)}
            />
          ))}

          {templates.length === 0 && (
            <div className="text-center py-8 text-[var(--grey-400)] text-sm">
              <Video className="mx-auto mb-2 h-8 w-8 opacity-50" />
              <p>No templates added yet.</p>
              <p className="mt-1">Add video styles to inspire idea generation.</p>
            </div>
          )}
        </div>
      </div>

      <CreateTemplateModal
        open={isModalOpen}
        onOpenChange={handleModalClose}
        projectId={projectId}
        channels={channels}
        onTemplateCreated={handleTemplateCreated}
        onTemplateUpdated={handleTemplateUpdated}
        editingTemplate={editingTemplate}
      />
    </div>
  );
}

interface TemplateCardProps {
  template: ProjectTemplateWithChannels;
  onEdit: () => void;
  onDelete: () => void;
}

function TemplateCard({
  template,
  onEdit,
  onDelete,
}: TemplateCardProps) {
  const isVertical = template.orientation === "vertical";
  
  return (
    <div
      className="rounded-lg border border-[var(--border)] bg-[var(--grey-50)] p-4 group cursor-pointer transition-colors hover:border-[var(--grey-200)]"
      onClick={onEdit}
    >
      <div className="flex items-start gap-4">
        {/* Thumbnail - shape reflects orientation */}
        <div 
          className={cn(
            "flex-shrink-0 rounded-md overflow-hidden bg-[var(--grey-100)]",
            isVertical ? "w-14 aspect-[9/16]" : "w-24 aspect-video"
          )}
        >
          {template.image_url ? (
            <img
              src={template.image_url}
              alt={template.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Video className={cn("text-[var(--grey-300)]", isVertical ? "h-5 w-5" : "h-6 w-6")} />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <span className="text-sm font-medium text-[var(--grey-800)]">
            {template.name}
          </span>
          {template.description && (
            <p className="text-xs text-[var(--grey-400)] mt-0.5 line-clamp-2">
              {template.description}
            </p>
          )}
          {/* Channel badges */}
          {template.channels.length > 0 && (
            <div className="flex items-center gap-1.5 mt-2">
              {template.channels.map((channel) => (
                <div
                  key={channel.id}
                  className="flex items-center justify-center w-5 h-5 rounded bg-white border border-[var(--border)]"
                  title={getPlatformLabel(channel.platform, channel.custom_label)}
                >
                  <PlatformIcon platform={channel.platform} className="h-3 w-3" />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
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

