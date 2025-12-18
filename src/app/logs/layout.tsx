import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { AppHeader } from "@/components/layout/app-header";
import { LogsNav } from "./logs-nav";

interface LogsLayoutProps {
  children: React.ReactNode;
}

export default async function LogsLayout({ children }: LogsLayoutProps) {
  const supabase = await createClient();

  // Verify user is authenticated
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  // Verify user is an app admin
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!profile?.is_admin) {
    redirect("/");
  }

  return (
    <div className="min-h-screen bg-[var(--grey-25)] flex flex-col">
      <AppHeader />
      
      <div className="flex-1 overflow-y-auto">
        <div className="pb-12">
          {/* Header */}
          <div>
            <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4">
              <h1 className="text-xl font-medium text-[var(--grey-800)] tracking-[-0.25px]">
                AI Logs
              </h1>
              <p className="text-sm text-[var(--grey-400)] mt-0.5">
                Audit AI-generated content, prompts, and conversations
              </p>
            </div>
          </div>

          {/* Nav */}
          <LogsNav />

          {/* Content */}
          {children}
        </div>
      </div>
    </div>
  );
}



