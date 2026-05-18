"use client";

import { useEffect, useState } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DOMAIN_META } from "@/data/scenarios";
import { useProgress } from "@/components/progress/XpProvider";

function Bar({
  label,
  pct,
  mounted,
  delay,
}: {
  label: string;
  pct: number;
  mounted: boolean;
  delay: number;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-baseline justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-mono text-claude-muted">{pct}%</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
        <div
          className="h-full rounded-full bg-claude-orange/70 transition-[width] duration-700 ease-out"
          style={{
            width: mounted ? `${pct}%` : "0%",
            transitionDelay: `${delay}ms`,
          }}
        />
      </div>
    </div>
  );
}

export function MasteryDashboard() {
  const { snapshot } = useProgress();
  const [animated, setAnimated] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => setAnimated(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const rows = [...snapshot.mastery].sort((a, b) => a.domain - b.domain);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-display text-2xl">Domain mastery</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {rows.map((m, i) => {
          const meta = DOMAIN_META[m.domain];
          return (
            <div key={m.domain} className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="font-mono text-claude-orange">
                    D{m.domain}
                  </span>
                  <span className="truncate text-sm text-foreground">
                    {meta?.name}
                  </span>
                  <Badge variant="outline" className="shrink-0">
                    {meta?.weight}%
                  </Badge>
                </div>
                <span className="shrink-0 font-mono text-lg text-claude-orange">
                  {m.mastery}%
                </span>
              </div>
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-secondary">
                <div
                  className="h-full rounded-full bg-claude-orange transition-[width] duration-700 ease-out"
                  style={{
                    width: animated ? `${m.mastery}%` : "0%",
                    transitionDelay: `${i * 100}ms`,
                  }}
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <Bar
                  label="Cards"
                  pct={Math.round(
                    ((m.reviewedPct + m.correctPct) / 2) * 100
                  )}
                  mounted={animated}
                  delay={i * 100 + 60}
                />
                <Bar
                  label="Mock"
                  pct={Math.round(m.mockPct * 100)}
                  mounted={animated}
                  delay={i * 100 + 120}
                />
                <Bar
                  label="Guide"
                  pct={Math.round(m.guidePct * 100)}
                  mounted={animated}
                  delay={i * 100 + 180}
                />
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
