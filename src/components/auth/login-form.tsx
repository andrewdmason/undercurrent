"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const isDev = process.env.NODE_ENV === "development";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await signIn(email, password);
  };

  const signIn = async (emailToUse: string, passwordToUse: string) => {
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: emailToUse,
      password: passwordToUse,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    router.push("/");
    router.refresh();
  };

  const handleDevLogin = () => {
    signIn("andrew@test.com", "password123");
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="rounded-xl bg-[#f72736]/10 px-3 py-2.5 text-xs text-[#f72736]">
          {error}
        </div>
      )}
      
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
        <div className="flex items-center justify-between">
          <Label htmlFor="password">Password</Label>
          <Link
            href="/forgot-password"
            className="text-xs text-[var(--grey-400)] hover:text-[var(--grey-800)] transition-colors duration-150"
          >
            Forgot password?
          </Link>
        </div>
        <Input
          id="password"
          type="password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete="current-password"
        />
      </div>
      
      <div className="space-y-3 pt-2">
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Signing in..." : "Sign in"}
        </Button>
        
        {isDev && (
          <Button
            type="button"
            variant="outline"
            className="w-full border-dashed"
            onClick={handleDevLogin}
            disabled={loading}
          >
            Dev: Sign in as Andrew
          </Button>
        )}
      </div>
      
      <p className="text-center text-xs text-[var(--grey-400)] pt-2">
        Don&apos;t have an account?{" "}
        <Link 
          href="/signup" 
          className="text-[#1a5eff] hover:underline underline-offset-2"
        >
          Sign up
        </Link>
      </p>
    </form>
  );
}
