"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { deleteProject } from "@/lib/actions/project";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface DeleteProjectSectionProps {
  projectId: string;
  projectName: string;
}

export function DeleteProjectSection({
  projectId,
  projectName,
}: DeleteProjectSectionProps) {
  const router = useRouter();
  const [showDialog, setShowDialog] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  const isConfirmed = confirmText === projectName;

  const handleDelete = async () => {
    if (!isConfirmed) return;

    setIsDeleting(true);
    const result = await deleteProject(projectId);

    if (result?.error) {
      toast.error(result.error);
      setIsDeleting(false);
    } else {
      // Clear lastProjectSlug from localStorage
      if (typeof window !== "undefined") {
        localStorage.removeItem("undercurrent:lastProjectSlug");
      }
      toast.success("Project deleted successfully");
      router.push("/");
    }
  };

  return (
    <>
      <div className="mt-12 pt-8 border-t border-red-200">
        <div className="rounded-lg border-2 border-red-200 bg-red-50/50 p-6">
          <h3 className="text-sm font-semibold text-red-800 mb-2">
            Danger Zone
          </h3>
          <p className="text-sm text-red-700 mb-4">
            Permanently delete this project and all its data. This action cannot
            be undone.
          </p>
          <Button
            variant="outline"
            onClick={() => setShowDialog(true)}
            className="border-red-300 text-red-700 hover:bg-red-100 hover:text-red-800"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete Project
          </Button>
        </div>
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-red-800">Delete Project</DialogTitle>
            <DialogDescription className="text-[var(--grey-600)]">
              This will permanently delete{" "}
              <span className="font-semibold text-[var(--grey-800)]">
                {projectName}
              </span>{" "}
              and all associated data including ideas, characters, templates,
              channels, topics, and team members.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="confirm" className="text-sm text-[var(--grey-600)]">
                Type <span className="font-semibold">{projectName}</span> to
                confirm
              </Label>
              <Input
                id="confirm"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder={projectName}
                className="h-9"
                autoComplete="off"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => {
                setShowDialog(false);
                setConfirmText("");
              }}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={!isConfirmed || isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? "Deleting..." : "Delete Project"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

