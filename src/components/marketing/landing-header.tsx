import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";

export function LandingHeader() {
  return (
    <header className="py-4 border-b border-grey-100-a bg-white/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-6">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link href="/">
            <Image
              src="/logo.png"
              alt="Undercurrent"
              width={32}
              height={32}
              className="rounded"
            />
          </Link>

          {/* Navigation */}
          <div className="flex items-center gap-4">
            <Button asChild variant="ghost">
              <Link href="/login">Log in</Link>
            </Button>
            <Button asChild>
              <Link href="/signup">Sign up</Link>
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}

