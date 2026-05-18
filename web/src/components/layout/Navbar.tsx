"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Github, Menu, Flame } from "lucide-react";

import { cn } from "@/lib/utils";
import { useProgress } from "@/components/progress/XpProvider";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

const REPO_URL =
  "https://github.com/vigneshbarani24/claude-certified-architect-exam-guide";

const NAV_LINKS = [
  { href: "/guide", label: "Guide" },
  { href: "/mock-exam", label: "Mock Exam" },
  { href: "/flashcards", label: "Flashcards" },
  { href: "/notebooklm", label: "NotebookLM" },
  { href: "/profile", label: "Profile" },
  { href: "/leaderboard", label: "Leaderboard" },
];

function XpChip({
  className,
  onClick,
}: {
  className?: string;
  onClick?: () => void;
}) {
  const { mounted, snapshot } = useProgress();
  // Hydration-safe: render nothing until mounted on the client.
  if (!mounted) return null;
  return (
    <Link
      href="/profile"
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 rounded-md border border-claude-orange/40 bg-claude-orange/5 px-2.5 py-1.5 font-mono text-xs text-claude-orange transition-colors hover:bg-claude-orange/10",
        className
      )}
      aria-label="View your profile"
    >
      <span>{snapshot.rank.name}</span>
      <span className="text-claude-muted">·</span>
      <span>{snapshot.xp.toLocaleString()} XP</span>
      {snapshot.streak > 0 && (
        <span className="flex items-center gap-0.5">
          <Flame className="h-3 w-3" />
          {snapshot.streak}
        </span>
      )}
    </Link>
  );
}

export function Navbar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2">
          <span className="font-display text-2xl leading-none text-foreground">
            CCAF
          </span>
          <span className="font-display text-2xl leading-none text-claude-orange">
            Guide
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {NAV_LINKS.map((l) => {
            const active = pathname === l.href;
            return (
              <Link
                key={l.href}
                href={l.href}
                className={cn(
                  "rounded-md px-3 py-2 text-sm transition-colors",
                  active
                    ? "text-claude-orange"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          <XpChip className="hidden lg:flex" />
          <Button asChild variant="outline" size="sm" className="hidden sm:flex">
            <a href={REPO_URL} target="_blank" rel="noopener noreferrer">
              <Github className="h-4 w-4" />
              Star on GitHub
            </a>
          </Button>

          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden"
                aria-label="Open menu"
              >
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72">
              <SheetHeader>
                <SheetTitle className="font-display text-xl">
                  CCAF Guide
                </SheetTitle>
              </SheetHeader>
              <div className="mt-4">
                <XpChip
                  className="w-full justify-center"
                  onClick={() => setOpen(false)}
                />
              </div>
              <nav className="mt-4 flex flex-col gap-1">
                {NAV_LINKS.map((l) => (
                  <Link
                    key={l.href}
                    href={l.href}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "rounded-md px-3 py-2.5 text-sm transition-colors",
                      pathname === l.href
                        ? "bg-secondary text-claude-orange"
                        : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                    )}
                  >
                    {l.label}
                  </Link>
                ))}
                <a
                  href={REPO_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 flex items-center gap-2 rounded-md border border-border px-3 py-2.5 text-sm text-foreground hover:bg-secondary"
                >
                  <Github className="h-4 w-4" />
                  Star on GitHub
                </a>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
