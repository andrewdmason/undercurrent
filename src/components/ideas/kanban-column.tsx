"use client";

import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { KanbanStatus, KANBAN_STATUS_LABELS } from "@/lib/types";
import { KanbanCard } from "./kanban-card";
import { IdeaWithChannels } from "@/lib/types";

interface KanbanColumnProps {
  status: KanbanStatus;
  ideas: IdeaWithChannels[];
  projectSlug: string;
}

export function KanbanColumn({ status, ideas, projectSlug }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: status,
  });

  const ideaIds = ideas.map((idea) => idea.id);

  return (
    <div className="flex flex-col">
      {/* Column Header */}
      <div className="flex items-center gap-2 py-3">
        <h3 className="text-sm font-medium text-[var(--grey-800)]">
          {KANBAN_STATUS_LABELS[status]}
        </h3>
        <span className="text-xs text-[var(--grey-400)] tabular-nums">
          {ideas.length}
        </span>
      </div>

      {/* Droppable Area */}
      <div
        ref={setNodeRef}
        className={`flex-1 rounded-lg transition-colors min-h-[200px] ${
          isOver ? "bg-[var(--grey-100)]" : ""
        }`}
      >
        <SortableContext items={ideaIds} strategy={verticalListSortingStrategy}>
          <div className="flex flex-col gap-3">
            {ideas.map((idea) => (
              <KanbanCard
                key={idea.id}
                idea={idea}
                projectSlug={projectSlug}
              />
            ))}
            {ideas.length === 0 && (
              <div className="flex items-center justify-center py-8 text-sm text-[var(--grey-400)] border border-dashed border-[var(--grey-200)] rounded-lg">
                No ideas
              </div>
            )}
          </div>
        </SortableContext>
      </div>
    </div>
  );
}
