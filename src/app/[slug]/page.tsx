import { redirect } from "next/navigation";

interface BusinessPageProps {
  params: Promise<{
    slug: string;
  }>;
}

export default async function BusinessPage({ params }: BusinessPageProps) {
  const { slug } = await params;
  redirect(`/${slug}/new`);
}
