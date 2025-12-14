import { redirect } from "next/navigation";

export default async function LogsPage({
  searchParams,
}: {
  searchParams: Promise<{ project?: string }>;
}) {
  const { project: projectId } = await searchParams;
  const projectParam = projectId ? `?project=${projectId}` : "";
  redirect(`/logs/tools${projectParam}`);
}
