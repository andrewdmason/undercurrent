import { AppHeader } from "@/components/layout/app-header";

export default function BusinessLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen">
      <AppHeader />
      <main>{children}</main>
    </div>
  );
}

