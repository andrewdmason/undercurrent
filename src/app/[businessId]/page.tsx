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
    <div className="flex-1 flex flex-col">
      {/* Main content area */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          {/* Icon */}
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[var(--grey-50)] mb-6">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-[var(--grey-400)]"
            >
              <polygon points="23 7 16 12 23 17 23 7" />
              <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
            </svg>
          </div>
          
          {/* Heading */}
          <h1 className="text-2xl font-normal tracking-[-0.46px] text-[var(--grey-800)] mb-2">
            Welcome to {business?.name}
          </h1>
          
          {/* Description */}
          <p className="text-sm text-[var(--grey-400)] tracking-[-0.08px] leading-relaxed mb-6">
            Your video ideas will appear here once you complete the onboarding
            and generate your first batch.
          </p>
          
          {/* Status badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--grey-50)] border border-[var(--border)]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#cc7300]" />
            <span className="text-xs font-medium text-[var(--grey-600)]">
              Feed coming soon
            </span>
          </div>
        </div>
      </div>
      
      {/* Bottom hint area */}
      <div className="border-t border-[var(--border)] p-4">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-start gap-3 rounded-xl bg-[var(--grey-50)] p-4">
            <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-[var(--grey-0)] border border-[var(--border)] flex items-center justify-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-[var(--grey-400)]"
              >
                <circle cx="12" cy="12" r="10" />
                <path d="M12 16v-4" />
                <path d="M12 8h.01" />
              </svg>
            </div>
            <div>
              <p className="text-xs font-semibold text-[var(--grey-800)] mb-0.5">
                What&apos;s next?
              </p>
              <p className="text-xs text-[var(--grey-400)] leading-relaxed">
                Complete your business profile and onboarding to start generating personalized video ideas powered by AI.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
