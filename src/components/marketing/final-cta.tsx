import Link from "next/link";
import { Button } from "@/components/ui/button";

export function FinalCta() {
  return (
    <section className="py-24 md:py-32 bg-grey-800">
      <div className="max-w-3xl mx-auto px-6 text-center">
        <h2 className="text-3xl md:text-4xl font-semibold text-white mb-4">
          Ready to start posting video?
        </h2>
        <p className="text-lg text-grey-400 mb-8">
          Set up takes a few minutes. Create your first video today.
        </p>
        <Button
          asChild
          size="lg"
          className="text-base px-8 bg-white text-grey-800 hover:bg-grey-50"
        >
          <Link href="/signup">Get started</Link>
        </Button>
      </div>
    </section>
  );
}

