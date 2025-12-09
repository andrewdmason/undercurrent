import { CreateProjectForm } from "@/components/project/create-project-form";

export default function CreateProjectPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-semibold text-foreground">Undercurrent</h1>
      </div>
      <CreateProjectForm />
    </main>
  );
}
