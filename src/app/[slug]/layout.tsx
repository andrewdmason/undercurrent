import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { AppHeader } from "@/components/layout/app-header";

interface BusinessLayoutProps {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}

export default async function BusinessLayout({
  children,
  params,
}: BusinessLayoutProps) {
  const { slug } = await params;
  const supabase = await createClient();

  // Get business by slug
  const { data: business } = await supabase
    .from("businesses")
    .select("id")
    .eq("slug", slug)
    .single();

  if (!business) {
    notFound();
  }

  // Get counts for tabs
  const [{ count: inboxCount }, { count: queueCount }] = await Promise.all([
    supabase
      .from("ideas")
      .select("*", { count: "exact", head: true })
      .eq("business_id", business.id)
      .eq("status", "new"),
    supabase
      .from("ideas")
      .select("*", { count: "exact", head: true })
      .eq("business_id", business.id)
      .eq("status", "accepted"),
  ]);

  return (
    <div className="min-h-screen flex flex-col">
      <AppHeader 
        inboxCount={inboxCount ?? 0} 
        queueCount={queueCount ?? 0} 
      />
      <main className="flex-1">{children}</main>
    </div>
  );
}

