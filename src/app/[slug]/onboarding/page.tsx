import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { Project, ProjectCharacter, DistributionChannel, ProjectTopic, ProjectTemplateWithChannels } from "@/lib/types";
import { OnboardingProvider } from "@/components/onboarding/onboarding-context";
import { OnboardingWizard } from "@/components/onboarding/onboarding-wizard";

interface OnboardingPageProps {
  params: Promise<{
    slug: string;
  }>;
}

export default async function OnboardingPage({ params }: OnboardingPageProps) {
  const { slug } = await params;
  const supabase = await createClient();

  // Verify user is authenticated
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    notFound();
  }

  // Get project by slug
  const { data: project } = await supabase
    .from("projects")
    .select("*")
    .eq("slug", slug)
    .single();

  if (!project) {
    notFound();
  }

  // Verify user has access to this project
  const { data: membership } = await supabase
    .from("project_members")
    .select("id")
    .eq("project_id", project.id)
    .eq("user_id", user.id)
    .single();

  if (!membership) {
    notFound();
  }

  // Get characters for this project
  const { data: characters } = await supabase
    .from("project_characters")
    .select("*")
    .eq("project_id", project.id)
    .order("created_at", { ascending: true });

  // Get distribution channels for this project
  const { data: distributionChannels } = await supabase
    .from("project_channels")
    .select("*")
    .eq("project_id", project.id)
    .order("created_at", { ascending: true });

  // Get topics for this project
  const { data: topics } = await supabase
    .from("project_topics")
    .select("*")
    .eq("project_id", project.id)
    .order("created_at", { ascending: true });

  // Get templates for this project with their channel associations
  const { data: templates } = await supabase
    .from("project_templates")
    .select(`
      *,
      template_channels (
        channel_id,
        project_channels (
          id,
          platform,
          custom_label
        )
      )
    `)
    .eq("project_id", project.id)
    .order("created_at", { ascending: false });

  const typedProject = project as Project;
  const typedCharacters = (characters || []) as ProjectCharacter[];
  const typedChannels = (distributionChannels || []) as DistributionChannel[];
  const typedTopics = (topics || []) as ProjectTopic[];

  // Transform templates to flatten channel info
  const typedTemplates: ProjectTemplateWithChannels[] = (templates || []).map((template) => ({
    ...template,
    channels: (template.template_channels || [])
      .map((tc: { channel_id: string; project_channels: { id: string; platform: string; custom_label: string | null } | null }) => {
        const channel = tc.project_channels;
        return channel ? {
          id: channel.id,
          platform: channel.platform,
          custom_label: channel.custom_label,
        } : null;
      })
      .filter((c: unknown): c is { id: string; platform: string; custom_label: string | null } => c !== null),
    template_channels: undefined,
  }));

  return (
    <OnboardingProvider
      project={typedProject}
      characters={typedCharacters}
      channels={typedChannels}
      topics={typedTopics}
      templates={typedTemplates}
    >
      <OnboardingWizard />
    </OnboardingProvider>
  );
}









