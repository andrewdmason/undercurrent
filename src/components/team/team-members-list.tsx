"use client";

import { useState } from "react";
import { User, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { removeTeamMember, TeamMember } from "@/lib/actions/team";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface TeamMembersListProps {
  members: TeamMember[];
  businessId: string;
  currentUserId: string;
}

export function TeamMembersList({
  members,
  businessId,
  currentUserId,
}: TeamMembersListProps) {
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [confirmRemove, setConfirmRemove] = useState<TeamMember | null>(null);

  const handleRemove = async (member: TeamMember) => {
    setRemovingId(member.user_id);
    setConfirmRemove(null);

    try {
      const result = await removeTeamMember(businessId, member.user_id);

      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(
          member.user_id === currentUserId
            ? "You have left the team"
            : "Team member removed"
        );
      }
    } catch {
      toast.error("Failed to remove team member");
    } finally {
      setRemovingId(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  if (members.length === 0) {
    return (
      <div className="px-4 py-8 text-center">
        <User className="h-8 w-8 text-[var(--grey-200)] mx-auto mb-2" />
        <p className="text-sm text-[var(--grey-400)]">No team members yet</p>
      </div>
    );
  }

  return (
    <>
      <div className="divide-y divide-[var(--border)]">
        {members.map((member) => (
          <div
            key={member.id}
            className="px-4 py-3 flex items-center justify-between gap-4"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded bg-[var(--grey-50)] flex items-center justify-center flex-shrink-0">
                <User className="h-4 w-4 text-[var(--grey-400)]" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-[var(--grey-800)] truncate">
                  {member.full_name || "Unnamed User"}
                  {member.user_id === currentUserId && (
                    <span className="text-[var(--grey-400)] font-normal ml-1">
                      (you)
                    </span>
                  )}
                </p>
                <p className="text-xs text-[var(--grey-400)] truncate">
                  {member.email || `Joined ${formatDate(member.created_at)}`}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setConfirmRemove(member)}
              disabled={removingId === member.user_id}
              className="text-[var(--grey-400)] hover:text-red-600 flex-shrink-0"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>

      {/* Remove Confirmation Dialog */}
      <Dialog
        open={!!confirmRemove}
        onOpenChange={() => setConfirmRemove(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {confirmRemove?.user_id === currentUserId
                ? "Leave Team"
                : "Remove Team Member"}
            </DialogTitle>
            <DialogDescription>
              {confirmRemove?.user_id === currentUserId
                ? "Are you sure you want to leave this team? You'll lose access to this business and all its content."
                : `Are you sure you want to remove ${confirmRemove?.full_name || "this member"} from the team? They'll lose access to this business.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmRemove(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => confirmRemove && handleRemove(confirmRemove)}
            >
              {confirmRemove?.user_id === currentUserId ? "Leave" : "Remove"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

