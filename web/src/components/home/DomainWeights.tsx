"use client";

import { useEffect, useState } from "react";

import { DOMAIN_META } from "@/data/scenarios";

export function DomainWeights() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const domains = Object.entries(DOMAIN_META).map(([k, v]) => ({
    domain: Number(k),
    ...v,
  }));

  return (
    <div className="space-y-4">
      {domains.map((d, i) => (
        <div key={d.domain} className="space-y-1.5">
          <div className="flex items-baseline justify-between text-sm">
            <span>
              <span className="font-mono text-claude-orange">D{d.domain}</span>{" "}
              {d.name}
            </span>
            <span className="font-mono text-xs text-muted-foreground">
              {d.weight}%
            </span>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full rounded-full bg-claude-orange transition-[width] duration-1000 ease-out"
              style={{
                width: mounted ? `${d.weight}%` : "0%",
                transitionDelay: `${i * 150}ms`,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
