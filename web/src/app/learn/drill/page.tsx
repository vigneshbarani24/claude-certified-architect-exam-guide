"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Layers } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DrillMode } from "@/components/flashcards/DrillMode";
import { useProgress } from "@/components/progress/XpProvider";
import { getAllFlashcards } from "@/lib/flashcards";
import { getDueCardIds, getSrsBoxDistribution } from "@/lib/progress";
import { DOMAIN_META } from "@/data/scenarios";

// Pure client page, mounted-gated. No server data keeps the route ○ Static.
export const dynamic = "force-static";

type Mode = "due" | "all" | number;

export default function DrillPage() {
  const { mounted } = useProgress();
  const all = useMemo(() => getAllFlashcards(), []);
  const [mode, setMode] = useState<Mode>("due");

  const dueIds = useMemo(() => {
    if (!mounted) return new Set<string>();
    return new Set(getDueCardIds(all.map((c) => c.id)));
    // recompute when mounted flips
  }, [all, mounted]);

  const dist = mounted
    ? getSrsBoxDistribution()
    : { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  const totalScheduled = Object.values(dist).reduce((a, b) => a + b, 0);
  const maxBox = Math.max(1, ...Object.values(dist));
  const dueCount = dueIds.size;

  const deck = useMemo(() => {
    if (mode === "due") return all.filter((c) => dueIds.has(c.id));
    if (mode === "all") return all;
    return all.filter((c) => c.domain === mode);
  }, [all, dueIds, mode]);

  const filterMeta = useMemo(
    () =>
      ({
        domain: typeof mode === "number" ? mode : ("all" as const),
        difficulty: "all" as const,
        dueOnly: mode === "due",
      }) as const,
    [mode]
  );

  if (!mounted) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 px-4 py-12 sm:px-6">
        <div className="h-24 animate-pulse rounded-lg border border-border bg-card" />
        <div className="h-64 animate-pulse rounded-lg border border-border bg-card" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-12 sm:px-6">
      <div>
        <h1 className="flex items-center gap-3 font-display text-4xl">
          <Layers className="h-8 w-8 text-claude-orange" />
          Spaced drill
        </h1>
        <p className="mt-2 text-muted-foreground">
          Review the cards your Leitner schedule says are due. Rate each card
          Again / Hard / Good to reschedule it. Your place resumes
          automatically.
        </p>
      </div>

      <Card>
        <CardContent className="space-y-5 p-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="font-mono text-3xl text-claude-orange">
                {dueCount}
              </div>
              <div className="text-xs text-muted-foreground">
                card{dueCount === 1 ? "" : "s"} due for review today ·{" "}
                {totalScheduled} scheduled
              </div>
            </div>
            <Badge variant="outline">{all.length} total cards</Badge>
          </div>

          <div>
            <p className="mb-3 font-mono text-xs uppercase tracking-wider text-claude-muted">
              Leitner box distribution
            </p>
            <div className="grid grid-cols-5 gap-2">
              {[1, 2, 3, 4, 5].map((box) => {
                const n = dist[box] ?? 0;
                const h = Math.round((n / maxBox) * 64);
                return (
                  <div
                    key={box}
                    className="flex flex-col items-center gap-1"
                  >
                    <div className="flex h-16 w-full items-end">
                      <div
                        className="w-full rounded-sm bg-claude-orange/70 transition-all"
                        style={{
                          height: `${n > 0 ? Math.max(4, h) : 0}px`,
                        }}
                      />
                    </div>
                    <span className="font-mono text-xs text-foreground">
                      {n}
                    </span>
                    <span className="font-mono text-[10px] text-claude-muted">
                      box {box}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex flex-wrap gap-2 border-t border-border pt-4">
            <Button
              size="sm"
              variant={mode === "due" ? "default" : "outline"}
              onClick={() => setMode("due")}
              disabled={dueCount === 0}
            >
              Due ({dueCount})
            </Button>
            <Button
              size="sm"
              variant={mode === "all" ? "default" : "outline"}
              onClick={() => setMode("all")}
            >
              Drill all
            </Button>
            {[1, 2, 3, 4, 5].map((d) => (
              <Button
                key={d}
                size="sm"
                variant={mode === d ? "default" : "outline"}
                onClick={() => setMode(d)}
              >
                D{d} {DOMAIN_META[d]?.name?.split(" ")[0] ?? ""}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {mode === "due" && dueCount === 0 ? (
        <Card>
          <CardContent className="space-y-4 py-12 text-center">
            <p className="text-muted-foreground">
              Nothing is due right now. Drill the full deck or a single domain
              to schedule cards into your spaced-repetition queue.
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              <Button size="sm" onClick={() => setMode("all")}>
                Drill all {all.length}
              </Button>
              <Button asChild size="sm" variant="outline">
                <Link href="/learn">Back to curriculum</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <DrillMode deck={deck} filterMeta={filterMeta} />
      )}
    </div>
  );
}
