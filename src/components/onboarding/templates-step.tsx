"use client";

import { useState } from "react";
import { useOnboarding } from "./onboarding-context";
import { deleteTemplate } from "@/lib/actions/templates";
import { Button } from "@/components/ui/button";
import { ArrowRight, ArrowLeft, Plus, Trash2, SkipForward, Video } from "lucide-react";
import { cn } from "@/lib/utils";
import { ProjectTemplateWithChannels } from "@/lib/types";
import { CreateTemplateModal } from "@/components/strategy/create-template-modal";
import { PlatformIcon, getPlatformLabel } from "@/components/strategy/platform-icon";

export function TemplatesStep() {
  const { project, templates, channels, setTemplates, addTemplate, goNext, goBack } = useOnboarding();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleDeleteTemplate = async (templateId: string) => {
    await deleteTemplate(templateId);
    setTemplates(templates.filter((t) => t.id !== templateId));
  };

  const handleTemplateCreated = (template: ProjectTemplateWithChannels) => {
    addTemplate(template);
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="space-y-3">
        <h1 className="text-3xl sm:text-4xl font-semibold text-slate-900 tracking-tight">
          What video styles do you like?
        </h1>
        <p className="text-lg text-slate-500">
          Tell us about the types of videos you want to make. We&apos;ll use these as templates when suggesting ideas.
        </p>
      </div>

      {/* Template list */}
      <div className="space-y-3">
        {templates.map((template) => (
          <div
            key={template.id}
            className="flex items-center gap-4 p-4 bg-white rounded-xl border border-slate-200 group"
          >
            {/* Thumbnail */}
            <div className="flex-shrink-0 w-20 aspect-video rounded-lg overflow-hidden bg-slate-100">
              {template.image_url ? (
                <img
                  src={template.image_url}
                  alt={template.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Video className="h-5 w-5 text-slate-300" />
                </div>
              )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <span className="text-base font-medium text-slate-800">{template.name}</span>
              {template.description && (
                <p className="text-sm text-slate-400 mt-0.5 line-clamp-1">{template.description}</p>
              )}
              {/* Channel badges */}
              {template.channels.length > 0 && (
                <div className="flex items-center gap-1.5 mt-2">
                  {template.channels.map((channel) => (
                    <div
                      key={channel.id}
                      className="flex items-center justify-center w-5 h-5 rounded bg-slate-100"
                      title={getPlatformLabel(channel.platform, channel.custom_label)}
                    >
                      <PlatformIcon platform={channel.platform} className="h-3 w-3" />
                    </div>
                  ))}
                </div>
              )}
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleDeleteTemplate(template.id)}
              className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 p-0 text-slate-400 hover:text-red-500"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}

        {/* Add template button */}
        <Button
          variant="outline"
          onClick={() => setIsModalOpen(true)}
          className="h-11 w-full border-dashed"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add a video style
        </Button>

        {/* Empty state */}
        {templates.length === 0 && (
          <div className="text-center py-4 text-slate-400 text-sm">
            Examples: &quot;Talking head to camera&quot;, &quot;Screen recording with voiceover&quot;, &quot;Quick cuts with music&quot;
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
          {templates.length > 0 ? (
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

      {/* Create Template Modal */}
      <CreateTemplateModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        projectId={project.id}
        channels={channels}
        onTemplateCreated={handleTemplateCreated}
        onTemplateUpdated={() => {}} // Not used in create mode
        editingTemplate={null}
      />
    </div>
  );
}

