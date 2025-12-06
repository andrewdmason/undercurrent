import { createClient } from "@/lib/supabase/server";
import { getBusinessByInviteToken } from "@/lib/actions/team";
import { InviteAcceptClient } from "./invite-accept-client";

interface InvitePageProps {
  params: Promise<{
    token: string;
  }>;
}

export default async function InvitePage({ params }: InvitePageProps) {
  const { token } = await params;
  const supabase = await createClient();

  // Check if user is logged in
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Get business details by invite token
  const { business, error } = await getBusinessByInviteToken(token);

  return (
    <main className="flex min-h-screen">
      {/* Left side - Decorative */}
      <div className="hidden lg:flex lg:w-1/2 bg-[var(--grey-50)] items-center justify-center relative overflow-hidden">
        {/* Subtle grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.4]"
          style={{
            backgroundImage: `
              linear-gradient(var(--grey-200) 1px, transparent 1px),
              linear-gradient(90deg, var(--grey-200) 1px, transparent 1px)
            `,
            backgroundSize: "32px 32px",
          }}
        />
        {/* Gradient orbs */}
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-[#1a5eff]/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/3 right-1/4 w-80 h-80 bg-[#007bc2]/10 rounded-full blur-3xl" />

        <div className="relative z-10 px-12 max-w-lg">
          <div className="mb-8">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-t from-[#262626] to-[#404040] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.16)] mb-6">
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                <path d="M2 17l10 5 10-5" />
                <path d="M2 12l10 5 10-5" />
              </svg>
            </div>
          </div>
          <h2 className="text-2xl font-normal tracking-[-0.46px] text-[var(--grey-800)] mb-3">
            You&apos;ve been invited to join a team
          </h2>
          <p className="text-sm text-[var(--grey-400)] tracking-[-0.08px] leading-relaxed">
            Undercurrent helps teams generate, organize, and publish video ideas
            that resonate with their audience.
          </p>
        </div>
      </div>

      {/* Right side - Content */}
      <div className="flex flex-1 flex-col items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-sm">
          <InviteAcceptClient
            token={token}
            business={business || null}
            error={error || null}
            isLoggedIn={!!user}
          />
        </div>
      </div>
    </main>
  );
}
