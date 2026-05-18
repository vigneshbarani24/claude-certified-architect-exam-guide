"use client";

import { useMemo, useState } from "react";

import {
  getAllFlashcards,
  getDomains,
  type Difficulty,
} from "@/lib/flashcards";
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

export default function FlashcardsPage() {
  const all = getAllFlashcards();
  const domains = getDomains();
  const [domain, setDomain] = useState<string>("all");
  const [difficulty, setDifficulty] = useState<Difficulty | "all">("all");

  const deck = useMemo(() => {
    return all.filter((c) => {
      if (domain !== "all" && c.domain !== Number(domain)) return false;
      if (difficulty !== "all" && c.difficulty !== difficulty) return false;
      return true;
    });
  }, [all, domain, difficulty]);

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <div className="mb-8">
        <h1 className="font-display text-4xl">Flashcards</h1>
        <p className="mt-2 text-muted-foreground">
          Flip through {all.length} cards. Filter by domain and difficulty,
          mark hard cards, and review a session summary at the end.
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
        </div>
      </div>

      <DrillMode deck={deck} />
    </div>
  );
}
