import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { Project, ProjectCharacter, DistributionChannel, ProjectTopic, ProjectTemplateWithChannels } from "@/lib/types";
import { SettingsTabs } from "@/components/settings/settings-tabs";

interface SettingsPageProps {
  params: Promise<{
    slug: string;
  }>;
}

export default async function SettingsPage({ params }: SettingsPageProps) {
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
    .from("project_users")
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
    <div className="flex-1 flex flex-col min-h-0 bg-[var(--grey-25)]">
      <div className="flex-1 overflow-y-auto">
        <div className="pb-12">
          {/* Header */}
          <div>
            <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4">
              <h1 className="text-xl font-medium text-[var(--grey-800)] tracking-[-0.25px]">
                Project Settings
              </h1>
              <p className="text-sm text-[var(--grey-400)] mt-0.5">
                Configure your project details and video marketing strategy
              </p>
            </div>
          </div>

          {/* Tabs */}
          <SettingsTabs
            project={typedProject}
            characters={typedCharacters}
            channels={typedChannels}
            topics={typedTopics}
            templates={typedTemplates}
          />
        </div>
      </div>
    </div>
  );
}
