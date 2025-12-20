"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useOnboarding } from "./onboarding-context";
import { generateIdeas } from "@/lib/actions/ideas";
import { Button } from "@/components/ui/button";
import { Sparkles, Check, ArrowRight, Loader2 } from "lucide-react";

export function GeneratingStep() {
  const router = useRouter();
  const params = useParams();
  const slug = params?.slug as string;
  const { project } = useOnboarding();
  
  const [status, setStatus] = useState<"generating" | "complete">("generating");
  const [ideaCount, setIdeaCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isCancelled = false;

    console.log("[GeneratingStep] Starting generation for project:", project.id);

    const generate = async () => {
      try {
        console.log("[GeneratingStep] Calling generateIdeas...");
        const result = await generateIdeas(project.id, {
          count: 10,
          characterIds: undefined,
          channelIds: undefined,
          templateId: undefined,
          topicId: undefined,
        });
        console.log("[GeneratingStep] generateIdeas result:", JSON.stringify(result, null, 2));
        console.log("[GeneratingStep] isCancelled:", isCancelled);

        if (isCancelled) {
          console.log("[GeneratingStep] Cancelled, returning early");
          return;
        }

        if (result.error) {
          console.log("[GeneratingStep] Error in result:", result.error);
          setError(result.error);
          return;
        }

        console.log("[GeneratingStep] Success! Count:", result.count);
        setIdeaCount(result.count || 0);
        setStatus("complete");
      } catch (err) {
        console.error("[GeneratingStep] Error generating ideas:", err);
        if (!isCancelled) {
          setError("Failed to generate ideas. Please try again.");
        }
      }
    };

    generate();

    return () => {
      isCancelled = true;
    };
  }, [project.id]);

  const handleGoToIdeas = () => {
    router.push(`/${slug}`);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="text-center space-y-4">
        {status === "generating" ? (
          <>
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-violet-100 mb-4">
              <Sparkles className="h-8 w-8 text-violet-600 animate-pulse" />
            </div>
            <h1 className="text-3xl sm:text-4xl font-semibold text-slate-900 tracking-tight">
              Generating your first ideas...
            </h1>
            <p className="text-lg text-slate-500">
              Hang tight while the AI creates 10 video ideas for {project.name}
            </p>
          </>
        ) : (
          <>
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-4">
              <Check className="h-8 w-8 text-green-600" />
            </div>
            <h1 className="text-3xl sm:text-4xl font-semibold text-slate-900 tracking-tight">
              You&apos;re all set!
            </h1>
            <p className="text-lg text-slate-500">
              {ideaCount} video ideas are waiting in your feed
            </p>
          </>
        )}
      </div>

      {/* Error state */}
      {error && (
        <div className="rounded-xl bg-red-50 border border-red-200 p-4 text-center">
          <p className="text-red-600">{error}</p>
          <Button
            variant="outline"
            onClick={() => window.location.reload()}
            className="mt-3"
          >
            Try again
          </Button>
        </div>
      )}

      {/* Loading indicator */}
      {status === "generating" && !error && (
        <div className="flex justify-center">
          <Loader2 className="h-8 w-8 text-violet-600 animate-spin" />
        </div>
      )}

      {/* CTA */}
      {status === "complete" && !error && (
        <div className="text-center pt-4">
          <Button onClick={handleGoToIdeas} size="lg" className="h-12 px-8">
            Go to your ideas
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}

