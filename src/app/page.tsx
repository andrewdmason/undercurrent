export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-semibold text-foreground">
          Undercurrent
        </h1>
        <p className="text-lg text-muted-foreground max-w-md">
          AI-powered video idea generation for small businesses
        </p>
        <div className="pt-4">
          <span className="inline-flex items-center px-4 py-2 rounded-full bg-primary text-primary-foreground text-sm font-medium">
            Coming Soon
          </span>
        </div>
      </div>
    </main>
  );
}
