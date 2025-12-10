"use client";

import { useState } from "react";
import { User, Trash2, Shield, ShieldOff, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { removeTeamMember, updateTeamMemberRole, TeamMember } from "@/lib/actions/team";
import { ProjectRole } from "@/lib/types";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface TeamMembersListProps {
  members: TeamMember[];
  projectId: string;
  currentUserId: string;
  currentUserRole: ProjectRole;
}

export function TeamMembersList({
  members,
  projectId,
  currentUserId,
  currentUserRole,
}: TeamMembersListProps) {
  const isAdmin = currentUserRole === "admin";
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [confirmRemove, setConfirmRemove] = useState<TeamMember | null>(null);

  const handleRemove = async (member: TeamMember) => {
    setUpdatingId(member.user_id);
    setConfirmRemove(null);

    try {
      const result = await removeTeamMember(projectId, member.user_id);

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
      setUpdatingId(null);
    }
  };

  const handleRoleChange = async (member: TeamMember, newRole: ProjectRole) => {
    setUpdatingId(member.user_id);

    try {
      const result = await updateTeamMemberRole(projectId, member.user_id, newRole);

      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(
          newRole === "admin"
            ? `${member.full_name || "Member"} is now an admin`
            : `${member.full_name || "Member"} is no longer an admin`
        );
      }
    } catch {
      toast.error("Failed to update role");
    } finally {
      setUpdatingId(null);
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
        {members.map((member) => {
          const isSelf = member.user_id === currentUserId;
          const canManage = isAdmin && !isSelf;
          const canLeave = isSelf;

          return (
            <div
              key={member.id}
              className="px-4 py-3 flex items-center justify-between gap-4"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded bg-[var(--grey-50)] flex items-center justify-center flex-shrink-0">
                  <User className="h-4 w-4 text-[var(--grey-400)]" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-[var(--grey-800)] truncate flex items-center gap-1.5">
                    {member.full_name || "Unnamed User"}
                    {isSelf && (
                      <span className="text-[var(--grey-400)] font-normal">
                        (you)
                      </span>
                    )}
                    {member.role === "admin" && (
                      <span className="inline-flex items-center gap-0.5 text-xs text-[var(--grey-500)] font-normal">
                        <Shield className="h-3 w-3" />
                        Admin
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-[var(--grey-400)] truncate">
                    {member.email || `Joined ${formatDate(member.created_at)}`}
                  </p>
                </div>
              </div>

              {/* Actions */}
              {(canManage || canLeave) && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={updatingId === member.user_id}
                      className="text-[var(--grey-400)] hover:text-[var(--grey-600)] flex-shrink-0"
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {canManage && (
                      <>
                        {member.role === "member" ? (
                          <DropdownMenuItem
                            onClick={() => handleRoleChange(member, "admin")}
                          >
                            <Shield className="h-4 w-4 mr-2" />
                            Make admin
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem
                            onClick={() => handleRoleChange(member, "member")}
                          >
                            <ShieldOff className="h-4 w-4 mr-2" />
                            Remove admin
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => setConfirmRemove(member)}
                          className="text-red-600 focus:text-red-600"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Remove from team
                        </DropdownMenuItem>
                      </>
                    )}
                    {canLeave && (
                      <DropdownMenuItem
                        onClick={() => setConfirmRemove(member)}
                        className="text-red-600 focus:text-red-600"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Leave team
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          );
        })}
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
                ? "Are you sure you want to leave this team? You'll lose access to this project and all its content."
                : `Are you sure you want to remove ${confirmRemove?.full_name || "this member"} from the team? They'll lose access to this project.`}
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
