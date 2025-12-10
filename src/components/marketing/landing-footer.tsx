import Link from "next/link";

export function LandingFooter() {
  return (
    <footer className="py-8 border-t border-grey-100-a">
      <div className="max-w-6xl mx-auto px-6">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-grey-400">
          <p>© {new Date().getFullYear()} Undercurrent</p>
          <div className="flex gap-6">
            <Link href="/login" className="hover:text-grey-800 transition-colors">
              Log in
            </Link>
            <Link href="/signup" className="hover:text-grey-800 transition-colors">
              Sign up
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

