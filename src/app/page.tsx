import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { RedirectToBusiness } from "@/components/redirect-to-business";

export default async function HomePage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    redirect("/login");
  }

  // Get user's businesses
  const { data: businessUsers } = await supabase
    .from("business_users")
    .select("business_id")
    .eq("user_id", user.id);

  // If no businesses, redirect to create one
  if (!businessUsers || businessUsers.length === 0) {
    redirect("/create-business");
  }

  // Get the business IDs
  const businessIds = businessUsers.map((bu) => bu.business_id);

  // Use client component to check localStorage and redirect
  return <RedirectToBusiness businessIds={businessIds} />;
}
