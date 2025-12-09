"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface SignupFormProps {
  inviteToken?: string;
  projectName?: string;
}

export function SignupForm({ inviteToken, projectName }: SignupFormProps) {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    // If there's an invite token, redirect to the invite page
    if (inviteToken) {
      router.push(`/invite/${inviteToken}`);
    } else {
      router.push("/");
    }
    router.refresh();
  };

  // Preserve invite token and project name in the login link
  const loginHref = inviteToken
    ? `/login?invite=${inviteToken}${projectName ? `&project=${encodeURIComponent(projectName)}` : ''}`
    : "/login";

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="rounded-xl bg-[#f72736]/10 px-3 py-2.5 text-xs text-[#f72736]">
          {error}
        </div>
      )}
      
      <div className="space-y-1.5">
        <Label htmlFor="fullName">Full name</Label>
        <Input
          id="fullName"
          type="text"
          placeholder="Jane Smith"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          required
          autoComplete="name"
        />
      </div>
      
      <div className="space-y-1.5">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
        />
      </div>
      
      <div className="space-y-1.5">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
          autoComplete="new-password"
        />
        <p className="text-[11px] text-[var(--grey-400)] tracking-[0.055px]">
          Must be at least 6 characters
        </p>
      </div>
      
      <div className="pt-2">
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Creating account..." : "Create account"}
        </Button>
      </div>
      
      <p className="text-center text-xs text-[var(--grey-400)] pt-2">
        Already have an account?{" "}
        <Link 
          href={loginHref}
          className="text-[#1a5eff] hover:underline underline-offset-2"
        >
          Sign in
        </Link>
      </p>
    </form>
  );
}
