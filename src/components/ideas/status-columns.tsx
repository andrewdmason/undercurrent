"use client";

import Link from "next/link";
import Image from "next/image";
import { Clock } from "lucide-react";
import { IdeaWithChannels, PRODUCTION_STATUS_LABELS, ProductionStatus } from "@/lib/types";
import { PlatformIcon } from "@/components/strategy/platform-icon";

interface StatusColumnsProps {
  ideas: IdeaWithChannels[];
  projectSlug: string;
}

export function StatusColumns({ ideas, projectSlug }: StatusColumnsProps) {
  // Group ideas by status
  const ideasByStatus = {
    preproduction: ideas.filter((idea) => idea.status === "preproduction"),
    production: ideas.filter((idea) => idea.status === "production"),
    postproduction: ideas.filter((idea) => idea.status === "postproduction"),
  };

  return (
    <div className="grid grid-cols-3 gap-4">
      {(["preproduction", "production", "postproduction"] as const).map((status) => (
        <StatusColumn
          key={status}
          status={status}
          ideas={ideasByStatus[status]}
          projectSlug={projectSlug}
        />
      ))}
    </div>
  );
}

interface StatusColumnProps {
  status: ProductionStatus;
  ideas: IdeaWithChannels[];
  projectSlug: string;
}

function StatusColumn({ status, ideas, projectSlug }: StatusColumnProps) {
  return (
    <div className="flex flex-col min-h-[400px]">
      {/* Column Header */}
      <div className="flex items-center justify-between mb-3 px-1">
        <h3 className="text-sm font-medium text-[var(--grey-600)]">
          {PRODUCTION_STATUS_LABELS[status]}
        </h3>
        <span className="text-xs text-[var(--grey-400)] tabular-nums">
          {ideas.length}
        </span>
      </div>

      {/* Column Content */}
      <div className="flex-1 bg-[var(--grey-50)] rounded-lg p-2 space-y-2">
        {ideas.length === 0 ? (
          <div className="flex items-center justify-center h-24 text-sm text-[var(--grey-400)]">
            No ideas
          </div>
        ) : (
          ideas.map((idea) => (
            <ColumnCard key={idea.id} idea={idea} projectSlug={projectSlug} />
          ))
        )}
      </div>
    </div>
  );
}

interface ColumnCardProps {
  idea: IdeaWithChannels;
  projectSlug: string;
}

function ColumnCard({ idea, projectSlug }: ColumnCardProps) {
  return (
    <Link
      href={`/${projectSlug}/ideas/${idea.id}`}
      className="block bg-white rounded-lg border border-[var(--border)] shadow-sm hover:shadow-md transition-shadow overflow-hidden"
    >
      {/* Thumbnail */}
      {idea.image_url && (
        <div className="relative aspect-video">
          <Image
            src={idea.image_url}
            alt={idea.title}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 33vw"
          />
          {/* Channel icons overlay */}
          {idea.channels.length > 0 && (
            <div className="absolute bottom-2 left-2 flex items-center gap-1">
              {idea.channels.map((channel) => (
                <div
                  key={channel.id}
                  className="w-5 h-5 rounded bg-black/60 flex items-center justify-center"
                >
                  <PlatformIcon
                    platform={channel.platform}
                    className="w-3 h-3 text-white"
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Content */}
      <div className="p-3">
        <h4 className="text-sm font-medium text-[var(--grey-800)] line-clamp-2">
          {idea.title}
        </h4>
        
        {/* Prep time */}
        {idea.prepTimeMinutes !== undefined && idea.prepTimeMinutes > 0 && (
          <div className="flex items-center gap-1 mt-2 text-xs text-[var(--grey-400)]">
            <Clock className="h-3 w-3" />
            <span>{idea.prepTimeMinutes}min remaining</span>
          </div>
        )}
      </div>
    </Link>
  );
}
