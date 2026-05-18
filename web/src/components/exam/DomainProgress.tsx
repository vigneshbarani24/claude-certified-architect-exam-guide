"use client";

import { useEffect, useState } from "react";

import { DOMAIN_META } from "@/data/scenarios";

export interface DomainStat {
  domain: number;
  correct: number;
  total: number;
}

interface DomainProgressProps {
  stats: DomainStat[];
}

export function DomainProgress({ stats }: DomainProgressProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const sorted = [...stats].sort((a, b) => a.domain - b.domain);

  return (
    <div className="space-y-4">
      {sorted.map((s, i) => {
        const pct = s.total > 0 ? Math.round((s.correct / s.total) * 100) : 0;
        return (
          <div key={s.domain} className="space-y-1.5">
            <div className="flex items-baseline justify-between text-sm">
              <span className="text-foreground">
                <span className="font-mono text-claude-orange">
                  D{s.domain}
                </span>{" "}
                {DOMAIN_META[s.domain]?.name}
              </span>
              <span className="font-mono text-xs text-muted-foreground">
                {s.correct}/{s.total} · {pct}%
              </span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-secondary">
              <div
                className="h-full rounded-full bg-claude-orange transition-[width] duration-700 ease-out"
                style={{
                  width: mounted ? `${pct}%` : "0%",
                  transitionDelay: `${i * 120}ms`,
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
