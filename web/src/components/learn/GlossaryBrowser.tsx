"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";

import { GLOSSARY } from "@/data/glossary";
import { DOMAIN_INFO } from "@/lib/learn";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const SORTED = [...GLOSSARY].sort((a, b) =>
  a.term.toLowerCase().localeCompare(b.term.toLowerCase())
);

const DOMAIN_NAME: Record<number, string> = Object.fromEntries(
  DOMAIN_INFO.map((d) => [d.domain, d.name])
);

export function GlossaryBrowser() {
  const [query, setQuery] = useState("");
  const [domain, setDomain] = useState<number | "all">("all");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return SORTED.filter((e) => {
      if (domain !== "all" && e.domain !== domain) return false;
      if (!q) return true;
      return (
        e.term.toLowerCase().includes(q) ||
        e.definition.toLowerCase().includes(q)
      );
    });
  }, [query, domain]);

  return (
    <>
      <div className="mb-6 space-y-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-claude-muted" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search terms and definitions…"
            aria-label="Search glossary"
            className="w-full rounded-md border border-border bg-card py-2.5 pl-10 pr-3 text-sm text-foreground outline-none placeholder:text-claude-muted focus:border-claude-orange/60"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setDomain("all")}
            className={cn(
              "rounded-md border px-3 py-1.5 text-sm transition-colors",
              domain === "all"
                ? "border-claude-orange bg-claude-orange/10 text-foreground"
                : "border-border text-muted-foreground hover:text-foreground"
            )}
          >
            All
          </button>
          {DOMAIN_INFO.map((d) => (
            <button
              key={d.domain}
              type="button"
              onClick={() => setDomain(d.domain)}
              className={cn(
                "rounded-md border px-3 py-1.5 text-sm transition-colors",
                domain === d.domain
                  ? "border-claude-orange bg-claude-orange/10 text-foreground"
                  : "border-border text-muted-foreground hover:text-foreground"
              )}
            >
              D{d.domain}
            </button>
          ))}
        </div>
        <p className="font-mono text-xs text-claude-muted">
          {filtered.length} of {GLOSSARY.length} shown
        </p>
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No terms match that search.
          </CardContent>
        </Card>
      ) : (
        <dl className="space-y-3">
          {filtered.map((e) => (
            <Card key={e.term}>
              <CardContent className="space-y-1.5 p-5">
                <div className="flex flex-wrap items-center gap-2">
                  <dt className="font-display text-lg text-foreground">
                    {e.term}
                  </dt>
                  {typeof e.domain === "number" && (
                    <Badge variant="outline">
                      D{e.domain} · {DOMAIN_NAME[e.domain]}
                    </Badge>
                  )}
                </div>
                <dd className="text-sm leading-relaxed text-muted-foreground">
                  {e.definition}
                </dd>
              </CardContent>
            </Card>
          ))}
        </dl>
      )}
    </>
  );
}
