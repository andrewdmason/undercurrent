"use client";

import { useState } from "react";
import { Link2, Copy, Check, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { regenerateInviteLink } from "@/lib/actions/team";
import { toast } from "sonner";

interface InviteLinkSectionProps {
  businessId: string;
  initialInviteUrl: string;
}

export function InviteLinkSection({
  businessId,
  initialInviteUrl,
}: InviteLinkSectionProps) {
  const [inviteUrl, setInviteUrl] = useState(initialInviteUrl);
  const [copied, setCopied] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      toast.success("Link copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy link");
    }
  };

  const handleRegenerate = async () => {
    if (
      !confirm(
        "Are you sure you want to regenerate the invite link? The old link will no longer work."
      )
    ) {
      return;
    }

    setIsRegenerating(true);

    try {
      const result = await regenerateInviteLink(businessId);

      if (result.error) {
        toast.error(result.error);
      } else if (result.inviteUrl) {
        setInviteUrl(result.inviteUrl);
        toast.success("Invite link regenerated");
      }
    } catch {
      toast.error("Failed to regenerate link");
    } finally {
      setIsRegenerating(false);
    }
  };

  return (
    <div className="rounded-lg border border-[var(--border)] bg-white p-4">
      <div className="flex items-center gap-2 mb-3">
        <Link2 className="h-4 w-4 text-[var(--grey-400)]" />
        <h2 className="text-sm font-semibold text-[var(--grey-800)]">
          Invite Link
        </h2>
      </div>
      <div className="flex gap-2">
        <Input
          type="text"
          value={inviteUrl}
          readOnly
          className="flex-1 text-xs font-mono bg-[var(--grey-50)]"
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={handleCopy}
          className="shrink-0"
        >
          {copied ? (
            <Check className="h-4 w-4 text-green-600" />
          ) : (
            <Copy className="h-4 w-4" />
          )}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={handleRegenerate}
          disabled={isRegenerating}
          className="shrink-0"
        >
          <RefreshCw
            className={`h-4 w-4 ${isRegenerating ? "animate-spin" : ""}`}
          />
        </Button>
      </div>
      <p className="text-xs text-[var(--grey-400)] mt-2">
        Share this link with anyone you want to invite to your team. They&apos;ll
        need to create an account (or sign in) to join.
      </p>
    </div>
  );
}


