"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { ChevronDown, Github, Menu, Flame } from "lucide-react";

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
import { REPO_URL } from "@/lib/site";

interface NavItem {
  href: string;
  label: string;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const PRIMARY: NavItem[] = [
  { href: "/learn", label: "Curriculum" },
  { href: "/guide", label: "Guide" },
];

const GROUPS: NavGroup[] = [
  {
    label: "Practice",
    items: [
      { href: "/mock-exam", label: "Mock Exam" },
      { href: "/learn/drill", label: "Drill" },
      { href: "/learn/diagnostic", label: "Diagnostic" },
      { href: "/flashcards", label: "Flashcards" },
    ],
  },
  {
    label: "Reference",
    items: [
      { href: "/learn/quick-reference", label: "Quick Reference" },
      { href: "/learn/glossary", label: "Glossary" },
      { href: "/learn/exercises", label: "Exercises" },
      { href: "/resources", label: "Resources" },
      { href: "/notebooklm", label: "NotebookLM" },
    ],
  },
];

const PROGRESS_LINK: NavItem = { href: "/learn/progress", label: "Progress" };

// Flattened list for the mobile sheet.
const MOBILE_LINKS: NavItem[] = [
  ...PRIMARY,
  ...GROUPS.flatMap((g) => g.items),
  PROGRESS_LINK,
  { href: "/profile", label: "Profile" },
  { href: "/leaderboard", label: "Leaderboard" },
];

function DuePill({ onClick }: { onClick?: () => void }) {
  const { mounted, snapshot } = useProgress();
  if (!mounted || snapshot.srsDue <= 0) return null;
  return (
    <Link
      href="/learn/drill"
      onClick={onClick}
      className="flex items-center gap-1 rounded-md border border-claude-orange/40 bg-claude-orange/10 px-2 py-1.5 font-mono text-xs text-claude-orange transition-colors hover:bg-claude-orange/20"
      aria-label={`${snapshot.srsDue} cards due for review`}
    >
      {snapshot.srsDue} due
    </Link>
  );
}

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

  const linkClass = (active: boolean) =>
    cn(
      "rounded-md px-3 py-2 text-sm transition-colors",
      active
        ? "text-claude-orange"
        : "text-muted-foreground hover:text-foreground"
    );

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
          {PRIMARY.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={linkClass(pathname === l.href)}
            >
              {l.label}
            </Link>
          ))}

          {GROUPS.map((g) => {
            const groupActive = g.items.some((i) => pathname === i.href);
            return (
              <div key={g.label} className="group relative">
                <button
                  type="button"
                  className={cn(
                    "flex items-center gap-1",
                    linkClass(groupActive)
                  )}
                  aria-haspopup="true"
                >
                  {g.label}
                  <ChevronDown className="h-3.5 w-3.5" />
                </button>
                <div className="invisible absolute left-0 top-full z-50 min-w-[200px] pt-2 opacity-0 transition-opacity group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100">
                  <div className="rounded-md border border-border bg-card p-1 shadow-lg">
                    {g.items.map((i) => (
                      <Link
                        key={i.href}
                        href={i.href}
                        className={cn(
                          "block rounded-sm px-3 py-2 text-sm transition-colors",
                          pathname === i.href
                            ? "bg-secondary text-claude-orange"
                            : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                        )}
                      >
                        {i.label}
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}

          <Link
            href={PROGRESS_LINK.href}
            className={linkClass(pathname === PROGRESS_LINK.href)}
          >
            {PROGRESS_LINK.label}
          </Link>
        </nav>

        <div className="flex items-center gap-2">
          <DuePill />
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
            <SheetContent side="right" className="w-72 overflow-y-auto">
              <SheetHeader>
                <SheetTitle className="font-display text-xl">
                  CCAF Guide
                </SheetTitle>
              </SheetHeader>
              <div className="mt-4 space-y-2">
                <XpChip
                  className="w-full justify-center"
                  onClick={() => setOpen(false)}
                />
                <div className="flex justify-center">
                  <DuePill onClick={() => setOpen(false)} />
                </div>
              </div>
              <nav className="mt-4 flex flex-col gap-1">
                {MOBILE_LINKS.map((l) => (
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
