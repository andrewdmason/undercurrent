import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";

interface FeedPageProps {
  params: Promise<{
    businessId: string;
  }>;
}

export default async function FeedPage({ params }: FeedPageProps) {
  const { businessId } = await params;
  const supabase = await createClient();

  // Verify user has access to this business
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    notFound();
  }

  const { data: membership } = await supabase
    .from("business_users")
    .select("id")
    .eq("business_id", businessId)
    .eq("user_id", user.id)
    .single();

  if (!membership) {
    notFound();
  }

  // Get business details
  const { data: business } = await supabase
    .from("businesses")
    .select("name")
    .eq("id", businessId)
    .single();

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center py-16 space-y-4">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-primary"
            >
              <polygon points="23 7 16 12 23 17 23 7" />
              <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
            </svg>
          </div>
          <h1 className="text-2xl font-semibold">
            Welcome to {business?.name}
          </h1>
          <p className="text-muted-foreground max-w-md mx-auto">
            Your video ideas will appear here once you complete the onboarding
            and generate your first batch.
          </p>
          <div className="pt-4">
            <span className="inline-flex items-center px-4 py-2 rounded-full bg-muted text-muted-foreground text-sm">
              Feed coming soon
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

