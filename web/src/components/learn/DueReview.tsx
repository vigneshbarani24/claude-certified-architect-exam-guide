"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Layers } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useProgress } from "@/components/progress/XpProvider";
import { getSrsBoxDistribution } from "@/lib/progress";

export function DueReview() {
  const { snapshot, mounted } = useProgress();
  const [dist, setDist] = useState<Record<number, number>>({
    1: 0,
    2: 0,
    3: 0,
    4: 0,
    5: 0,
  });

  useEffect(() => {
    if (mounted) setDist(getSrsBoxDistribution());
  }, [mounted, snapshot]);

  const due = snapshot.srsDue;
  const totalScheduled = Object.values(dist).reduce((a, b) => a + b, 0);
  const maxBox = Math.max(1, ...Object.values(dist));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-display text-2xl">
          <Layers className="h-5 w-5 text-claude-orange" />
          Spaced review
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="font-mono text-3xl text-claude-orange">{due}</div>
            <div className="text-xs text-muted-foreground">
              {due === 0
                ? "Nothing due — schedule cards by rating them in a drill."
                : `card${due === 1 ? "" : "s"} due for review today`}
            </div>
          </div>
          <Button asChild disabled={due === 0}>
            {due === 0 ? (
              <span aria-disabled className="pointer-events-none opacity-50">
                Review due (0)
              </span>
            ) : (
              <Link href="/flashcards?due=1">Review due ({due})</Link>
            )}
          </Button>
        </div>

        <div>
          <p className="mb-3 font-mono text-xs uppercase tracking-wider text-claude-muted">
            Leitner box distribution ({totalScheduled} scheduled)
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
                      style={{ height: `${n > 0 ? Math.max(4, h) : 0}px` }}
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
      </CardContent>
    </Card>
  );
}
