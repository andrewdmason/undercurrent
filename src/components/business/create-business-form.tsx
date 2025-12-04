"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function CreateBusinessForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      setError("You must be logged in to create a business");
      setLoading(false);
      return;
    }

    // Create the business
    const { data: business, error: businessError } = await supabase
      .from("businesses")
      .insert({
        name,
        url: url || null,
        created_by: user.id,
      })
      .select()
      .single();

    if (businessError) {
      setError(businessError.message);
      setLoading(false);
      return;
    }

    // Add user to business_users
    const { error: memberError } = await supabase
      .from("business_users")
      .insert({
        business_id: business.id,
        user_id: user.id,
      });

    if (memberError) {
      setError(memberError.message);
      setLoading(false);
      return;
    }

    // Store as last selected business
    if (typeof window !== "undefined") {
      localStorage.setItem("undercurrent:lastBusinessId", business.id);
    }

    // Redirect to the business feed
    router.push(`/${business.id}`);
    router.refresh();
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-semibold">Create your business</CardTitle>
        <CardDescription>
          Tell us about your business to get started with video ideas
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="name">Business name</Label>
            <Input
              id="name"
              type="text"
              placeholder="Acme Inc."
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="url">Website URL</Label>
            <Input
              id="url"
              type="url"
              placeholder="https://example.com"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Optional — helps us understand your business
            </p>
          </div>
        </CardContent>
        <CardFooter>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Creating..." : "Create business"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}


