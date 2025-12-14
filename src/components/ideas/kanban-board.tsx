"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  rectIntersection,
  pointerWithin,
  CollisionDetection,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates, arrayMove } from "@dnd-kit/sortable";
import { toast } from "sonner";
import { IdeaWithChannels, KANBAN_STATUSES, KanbanStatus } from "@/lib/types";
import { updateIdeaStatusAndOrder, updateIdeaSortOrders } from "@/lib/actions/ideas";
import { KanbanColumn } from "./kanban-column";
import { KanbanCard } from "./kanban-card";

interface KanbanBoardProps {
  ideas: IdeaWithChannels[];
  projectSlug: string;
}

// Custom collision detection that works well for kanban boards
// Prioritizes columns (droppables) when not directly over a card
const kanbanCollisionDetection: CollisionDetection = (args) => {
  // First, check if we're directly over any sortable items
  const pointerCollisions = pointerWithin(args);
  
  if (pointerCollisions.length > 0) {
    // If we're over a card, use that
    const cardCollision = pointerCollisions.find(
      (collision) => !KANBAN_STATUSES.includes(collision.id as KanbanStatus)
    );
    if (cardCollision) {
      return [cardCollision];
    }
  }
  
  // Otherwise, use rect intersection to find columns
  const rectCollisions = rectIntersection(args);
  
  // Prefer column droppables
  const columnCollision = rectCollisions.find(
    (collision) => KANBAN_STATUSES.includes(collision.id as KanbanStatus)
  );
  
  if (columnCollision) {
    return [columnCollision];
  }
  
  // Fall back to first collision
  return rectCollisions.length > 0 ? [rectCollisions[0]] : [];
};

export function KanbanBoard({ ideas, projectSlug }: KanbanBoardProps) {
  const router = useRouter();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [originalStatus, setOriginalStatus] = useState<KanbanStatus | null>(null);
  const [localIdeas, setLocalIdeas] = useState(ideas);
  const isDraggingRef = useRef(false);

  // Sync local ideas with props when not dragging
  useEffect(() => {
    if (!isDraggingRef.current) {
      setLocalIdeas(ideas);
    }
  }, [ideas]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px movement required before drag starts
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Group ideas by status (only kanban statuses, not published), sorted by sort_order
  const ideasByStatus = KANBAN_STATUSES.reduce((acc, status) => {
    acc[status] = localIdeas
      .filter((idea) => idea.status === status)
      .sort((a, b) => a.sort_order - b.sort_order);
    return acc;
  }, {} as Record<KanbanStatus, IdeaWithChannels[]>);

  const activeIdea = activeId ? localIdeas.find((idea) => idea.id === activeId) : null;

  const handleDragStart = useCallback((event: DragStartEvent) => {
    isDraggingRef.current = true;
    const ideaId = event.active.id as string;
    const idea = localIdeas.find((i) => i.id === ideaId);
    setActiveId(ideaId);
    // Store the original status so we can compare after drop
    if (idea && KANBAN_STATUSES.includes(idea.status as KanbanStatus)) {
      setOriginalStatus(idea.status as KanbanStatus);
    }
  }, [localIdeas]);

  const handleDragOver = useCallback((event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeIdeaId = active.id as string;
    const overId = over.id as string;

    // Find the idea being dragged
    const activeIdea = localIdeas.find((i) => i.id === activeIdeaId);
    if (!activeIdea) return;

    // Determine target status
    let targetStatus: KanbanStatus | null = null;

    // Check if over a column (status)
    if (KANBAN_STATUSES.includes(overId as KanbanStatus)) {
      targetStatus = overId as KanbanStatus;
    } else {
      // Over another card - find which column that card is in
      const overIdea = localIdeas.find((i) => i.id === overId);
      if (overIdea && KANBAN_STATUSES.includes(overIdea.status as KanbanStatus)) {
        targetStatus = overIdea.status as KanbanStatus;
      }
    }

    // If target status is different, move item to that column
    if (targetStatus && activeIdea.status !== targetStatus) {
      setLocalIdeas((prev) => {
        // Remove from old column and add to new column
        const updated = prev.map((i) =>
          i.id === activeIdeaId ? { ...i, status: targetStatus as KanbanStatus } : i
        );
        return updated;
      });
    }
  }, [localIdeas]);

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    isDraggingRef.current = false;
    const { active, over } = event;
    const draggedOriginalStatus = originalStatus;
    setActiveId(null);
    setOriginalStatus(null);

    if (!over || !draggedOriginalStatus) return;

    const activeIdeaId = active.id as string;
    const overId = over.id as string;

    // Find the dragged idea in current local state
    const activeIdea = localIdeas.find((i) => i.id === activeIdeaId);
    if (!activeIdea) return;

    const currentStatus = activeIdea.status as KanbanStatus;
    
    // Get the ideas in the target column, sorted by sort_order
    const columnIdeas = localIdeas
      .filter((i) => i.status === currentStatus)
      .sort((a, b) => a.sort_order - b.sort_order);
    const activeIndex = columnIdeas.findIndex((i) => i.id === activeIdeaId);

    // Determine if we dropped on a column or another card
    let targetIndex: number;
    if (KANBAN_STATUSES.includes(overId as KanbanStatus)) {
      // Dropped on empty column area - go to end
      targetIndex = columnIdeas.length - 1;
    } else {
      // Dropped on another card
      const overIndex = columnIdeas.findIndex((i) => i.id === overId);
      targetIndex = overIndex >= 0 ? overIndex : columnIdeas.length - 1;
    }

    // Check if status changed (moved between columns)
    const statusChanged = draggedOriginalStatus !== currentStatus;

    // Check if position changed within the column
    const positionChanged = activeIndex !== targetIndex;

    if (statusChanged || positionChanged) {
      // Reorder the column
      let reorderedColumn: IdeaWithChannels[];
      if (positionChanged && activeIndex >= 0) {
        reorderedColumn = arrayMove(columnIdeas, activeIndex, targetIndex);
      } else {
        reorderedColumn = columnIdeas;
      }

      // Update local state optimistically
      setLocalIdeas((prev) => {
        const otherIdeas = prev.filter((i) => i.status !== currentStatus);
        return [...otherIdeas, ...reorderedColumn];
      });

      // Persist changes
      if (statusChanged) {
        // Moving to a different column - update status and sort order
        const newSortOrder = targetIndex;
        const result = await updateIdeaStatusAndOrder(activeIdeaId, currentStatus, newSortOrder);
        
        if (result.error) {
          toast.error(result.error);
          router.refresh();
          return;
        }

        // Also update sort orders for other items in the target column
        const sortUpdates = reorderedColumn
          .filter((idea) => idea.id !== activeIdeaId)
          .map((idea, index) => ({
            id: idea.id,
            sort_order: index >= targetIndex ? index + 1 : index,
          }));

        if (sortUpdates.length > 0) {
          await updateIdeaSortOrders(sortUpdates);
        }
      } else if (positionChanged) {
        // Same column - just update sort orders
        const sortUpdates = reorderedColumn.map((idea, index) => ({
          id: idea.id,
          sort_order: index,
        }));

        const result = await updateIdeaSortOrders(sortUpdates);
        if (result.error) {
          toast.error(result.error);
          router.refresh();
        }
      }
    }
  }, [localIdeas, router, originalStatus]);

  const handleDragCancel = useCallback(() => {
    isDraggingRef.current = false;
    setActiveId(null);
    setOriginalStatus(null);
    // Revert to server state
    setLocalIdeas(ideas);
  }, [ideas]);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={kanbanCollisionDetection}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="grid grid-cols-3 gap-4">
        {KANBAN_STATUSES.map((status) => (
          <KanbanColumn
            key={status}
            status={status}
            ideas={ideasByStatus[status]}
            projectSlug={projectSlug}
          />
        ))}
      </div>

      {/* Drag Overlay - shows card being dragged */}
      <DragOverlay>
        {activeIdea ? (
          <div className="opacity-80">
            <KanbanCard idea={activeIdea} projectSlug={projectSlug} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

