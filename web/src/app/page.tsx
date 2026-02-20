import ImageResizer from "@/components/image-resizer";
import { ThemeToggle } from "@/components/theme-toggle";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-zinc-50 font-sans dark:bg-black">
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-6 py-12">
        {/* Header */}
        <div className="relative mb-10 text-center">
          <div className="absolute right-0 top-0">
            <ThemeToggle />
          </div>
          <div className="mb-4 flex items-center justify-center gap-3">
            <svg
              width="36"
              height="36"
              viewBox="0 0 36 36"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="text-amber-600"
            >
              <rect
                x="2"
                y="2"
                width="32"
                height="32"
                rx="4"
                stroke="currentColor"
                strokeWidth="2"
              />
              <line x1="12" y1="2" x2="12" y2="34" stroke="currentColor" strokeWidth="1" opacity="0.3" />
              <line x1="22" y1="2" x2="22" y2="34" stroke="currentColor" strokeWidth="1" opacity="0.3" />
              <line x1="2" y1="12" x2="34" y2="12" stroke="currentColor" strokeWidth="1" opacity="0.3" />
              <line x1="2" y1="22" x2="34" y2="22" stroke="currentColor" strokeWidth="1" opacity="0.3" />
              <path
                d="M17 2 C17 8, 15 12, 16 18 C17 24, 18 28, 17 34"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                fill="none"
              />
            </svg>
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
              Seam Carving
            </h1>
          </div>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Content-aware image resizing in the browser
          </p>
        </div>

        {/* Main Component */}
        <ImageResizer />
      </main>

      {/* Footer */}
      <footer className="py-6 text-center text-xs text-zinc-400 dark:text-zinc-600">
        <a
          href="https://github.com/narulaskaran/seam-carving"
          target="_blank"
          rel="noopener noreferrer"
          className="transition-colors hover:text-amber-600"
        >
          View on GitHub
        </a>
      </footer>
    </div>
  );
}
