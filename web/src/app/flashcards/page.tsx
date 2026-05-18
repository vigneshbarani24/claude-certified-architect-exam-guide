"use client";

import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

import {
  getAllFlashcards,
  getDomains,
  type Difficulty,
} from "@/lib/flashcards";
import { getDueCardIds } from "@/lib/progress";
import { DOMAIN_META } from "@/data/scenarios";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DrillMode } from "@/components/flashcards/DrillMode";
import { cn } from "@/lib/utils";

const DIFFICULTIES: (Difficulty | "all")[] = [
  "all",
  "easy",
  "medium",
  "hard",
];

function FlashcardsInner() {
  const params = useSearchParams();
  const all = getAllFlashcards();
  const domains = getDomains();

  // Initialize state once from the URL params (deep links from /learn).
  const initialDomain = (() => {
    const d = params.get("domain");
    return d && domains.includes(Number(d)) ? d : "all";
  })();
  const initialDifficulty = (() => {
    const d = params.get("difficulty");
    return d === "easy" || d === "medium" || d === "hard" ? d : "all";
  })();
  const initialDueOnly = params.get("due") === "1";
  const initialIndex = (() => {
    const n = Number(params.get("index"));
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
  })();

  const [domain, setDomain] = useState<string>(initialDomain);
  const [difficulty, setDifficulty] = useState<Difficulty | "all">(
    initialDifficulty
  );
  const [dueOnly, setDueOnly] = useState<boolean>(initialDueOnly);

  const deck = useMemo(() => {
    const filtered = all.filter((c) => {
      if (domain !== "all" && c.domain !== Number(domain)) return false;
      if (difficulty !== "all" && c.difficulty !== difficulty) return false;
      return true;
    });
    if (!dueOnly) return filtered;
    const dueSet = new Set(getDueCardIds(filtered.map((c) => c.id)));
    return filtered.filter((c) => dueSet.has(c.id));
  }, [all, domain, difficulty, dueOnly]);

  const filterMeta = {
    domain: domain === "all" ? ("all" as const) : Number(domain),
    difficulty,
    dueOnly,
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <div className="mb-8">
        <h1 className="font-display text-4xl">Flashcards</h1>
        <p className="mt-2 text-muted-foreground">
          Flip through {all.length} cards. Filter by domain and difficulty,
          rate cards Again / Hard / Good to schedule spaced review, and see a
          session summary at the end.
        </p>
      </div>

      <div className="mb-8 space-y-4">
        <Tabs value={domain} onValueChange={setDomain}>
          <TabsList className="flex h-auto flex-wrap">
            <TabsTrigger value="all">All domains</TabsTrigger>
            {domains.map((d) => (
              <TabsTrigger key={d} value={String(d)}>
                D{d} {DOMAIN_META[d]?.name?.split(" ")[0] ?? ""}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <div className="flex flex-wrap gap-2">
          {DIFFICULTIES.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDifficulty(d)}
              className={cn(
                "rounded-md border px-3 py-1.5 text-sm capitalize transition-colors",
                difficulty === d
                  ? "border-claude-orange bg-claude-orange/10 text-foreground"
                  : "border-border text-muted-foreground hover:text-foreground"
              )}
            >
              {d}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setDueOnly((v) => !v)}
            className={cn(
              "rounded-md border px-3 py-1.5 text-sm transition-colors",
              dueOnly
                ? "border-claude-orange bg-claude-orange/10 text-foreground"
                : "border-border text-muted-foreground hover:text-foreground"
            )}
          >
            Due only
          </button>
        </div>
      </div>

      <DrillMode
        deck={deck}
        initialIndex={initialIndex}
        filterMeta={filterMeta}
      />
    </div>
  );
}

export default function FlashcardsPage() {
  return (
    <Suspense fallback={null}>
      <FlashcardsInner />
    </Suspense>
  );
}
