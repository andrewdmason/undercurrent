import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";

export function LandingHero() {
  return (
    <section className="relative py-24 md:py-32">
      {/* Subtle gradient background */}
      <div className="absolute inset-0 bg-gradient-to-b from-grey-50/50 to-transparent pointer-events-none" />

      <div className="relative max-w-6xl mx-auto px-6">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Text content */}
          <div className="space-y-6">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-semibold tracking-tight text-grey-800 leading-[1.1]">
              You know you should be posting video.
            </h1>
            <p className="text-xl md:text-2xl text-grey-400 leading-relaxed">
              We&apos;ll make them for you.
            </p>
            <p className="text-lg text-grey-400 leading-relaxed max-w-lg">
              Undercurrent is for small business owners who know video marketing
              matters but don&apos;t have the resources to keep up. Tell us
              about your business, and we&apos;ll generate ideas, write scripts,
              and create videos—either by guiding you through a quick recording
              or using AI to generate everything automatically.
            </p>
            <div className="pt-4">
              <Button asChild size="lg" className="text-base px-8">
                <Link href="/signup">Get started</Link>
              </Button>
            </div>
          </div>

          {/* Hero image */}
          <div className="lg:order-last">
            <Image
              src="/marketing/hero.jpg"
              alt="Undercurrent video ideas feed"
              width={600}
              height={600}
              className="rounded-lg shadow-xl"
            />
          </div>
        </div>
      </div>
    </section>
  );
}

