"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Building2, AlertCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { acceptInvite } from "@/lib/actions/team";
import { toast } from "sonner";

interface InviteAcceptClientProps {
  token: string;
  business: {
    id: string;
    name: string;
    slug: string;
  } | null;
  error: string | null;
  isLoggedIn: boolean;
}

export function InviteAcceptClient({
  token,
  business,
  error,
  isLoggedIn,
}: InviteAcceptClientProps) {
  const router = useRouter();
  const [isAccepting, setIsAccepting] = useState(false);
  const [accepted, setAccepted] = useState(false);

  // Handle invalid invite
  if (error || !business) {
    return (
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-red-100 mb-4">
          <AlertCircle className="h-6 w-6 text-red-600" />
        </div>
        <h1 className="text-2xl font-normal tracking-[-0.46px] text-[var(--grey-800)] mb-2">
          Invalid Invite
        </h1>
        <p className="text-sm text-[var(--grey-400)] mb-6">
          {error || "This invite link is invalid."}
        </p>
        <Link href="/login">
          <Button variant="outline" className="w-full">
            Go to Login
          </Button>
        </Link>
      </div>
    );
  }

  // Handle successful acceptance
  if (accepted) {
    return (
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-green-100 mb-4">
          <CheckCircle2 className="h-6 w-6 text-green-600" />
        </div>
        <h1 className="text-2xl font-normal tracking-[-0.46px] text-[var(--grey-800)] mb-2">
          You&apos;re In!
        </h1>
        <p className="text-sm text-[var(--grey-400)] mb-6">
          You&apos;ve joined {business.name}. Redirecting you now...
        </p>
      </div>
    );
  }

  // User not logged in - redirect to signup
  if (!isLoggedIn) {
    return (
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[var(--grey-50)] mb-4">
          <Building2 className="h-6 w-6 text-[var(--grey-600)]" />
        </div>
        <h1 className="text-2xl font-normal tracking-[-0.46px] text-[var(--grey-800)] mb-2">
          Join {business.name}
        </h1>
        <p className="text-sm text-[var(--grey-400)] mb-6">
          You&apos;ve been invited to join <strong>{business.name}</strong> on
          Undercurrent. Create an account or sign in to accept.
        </p>
        <div className="space-y-3">
          <Link href={`/signup?invite=${token}&business=${encodeURIComponent(business.name)}`}>
            <Button className="w-full">Create Account</Button>
          </Link>
          <Link href={`/login?invite=${token}&business=${encodeURIComponent(business.name)}`}>
            <Button variant="outline" className="w-full">
              Already have an account? Sign In
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  // User logged in - show accept button
  const handleAccept = async () => {
    setIsAccepting(true);

    try {
      const result = await acceptInvite(token);

      if (result.error) {
        toast.error(result.error);
        setIsAccepting(false);
      } else {
        setAccepted(true);
        toast.success(`Joined ${business.name}!`);
        // Redirect after a short delay
        setTimeout(() => {
          router.push(`/${result.business_slug}`);
        }, 1500);
      }
    } catch {
      toast.error("Failed to accept invite");
      setIsAccepting(false);
    }
  };

  return (
    <div className="text-center">
      <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[var(--grey-50)] mb-4">
        <Building2 className="h-6 w-6 text-[var(--grey-600)]" />
      </div>
      <h1 className="text-2xl font-normal tracking-[-0.46px] text-[var(--grey-800)] mb-2">
        Join {business.name}
      </h1>
      <p className="text-sm text-[var(--grey-400)] mb-6">
        You&apos;ve been invited to collaborate on <strong>{business.name}</strong>.
        Click below to join the team.
      </p>
      <Button className="w-full" onClick={handleAccept} disabled={isAccepting}>
        {isAccepting ? "Joining..." : "Accept Invite"}
      </Button>
    </div>
  );
}
