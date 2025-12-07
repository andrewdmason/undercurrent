import { CreateBusinessForm } from "@/components/business/create-business-form";

export default function CreateBusinessPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-semibold text-foreground">Undercurrent</h1>
      </div>
      <CreateBusinessForm />
    </main>
  );
}





