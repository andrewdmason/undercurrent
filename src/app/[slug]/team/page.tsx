import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { getTeamMembers, getInviteLink, getCurrentUserRole } from "@/lib/actions/team";
import { TeamMembersList } from "@/components/team/team-members-list";
import { InviteLinkSection } from "@/components/team/invite-link-section";

interface TeamPageProps {
  params: Promise<{
    slug: string;
  }>;
}

export default async function TeamPage({ params }: TeamPageProps) {
  const { slug } = await params;
  const supabase = await createClient();

  // Verify user is authenticated
  const {
    data: { user },
  } = await supabase.auth.getUser();
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

  // Get team members, invite link, and current user's role
  const [membersResult, inviteLinkResult, roleResult] = await Promise.all([
    getTeamMembers(project.id),
    getInviteLink(project.id),
    getCurrentUserRole(project.id),
  ]);

  const members = membersResult.members || [];
  const inviteUrl = inviteLinkResult.inviteUrl || "";
  const currentUserRole = roleResult.role || "member";

  return (
    <div className="pb-12">
      {/* Header */}
      <div className="border-b border-[var(--border)] bg-[var(--grey-0)]">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4">
          <h1 className="text-xl font-medium text-[var(--grey-800)] tracking-[-0.25px]">
            Manage Team
          </h1>
          <p className="text-sm text-[var(--grey-400)] mt-0.5">
            Invite team members to collaborate on {project.name}
          </p>
        </div>
      </div>

      {/* Content */}
      <div>
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 space-y-6">
          {/* Invite Link Section */}
          <InviteLinkSection projectId={project.id} initialInviteUrl={inviteUrl} />

          {/* Team Members Section */}
          <div className="rounded-lg border border-[var(--border)] bg-white">
            <div className="px-4 py-3 border-b border-[var(--border)]">
              <h2 className="text-sm font-semibold text-[var(--grey-800)]">
                Team Members
              </h2>
              <p className="text-xs text-[var(--grey-400)] mt-0.5">
                {members.length} {members.length === 1 ? "member" : "members"}
              </p>
            </div>
            <TeamMembersList
              members={members}
              projectId={project.id}
              currentUserId={user.id}
              currentUserRole={currentUserRole}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
