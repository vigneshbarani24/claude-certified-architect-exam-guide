"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { useProgress } from "@/components/progress/XpProvider";
import { DOMAIN_INFO, guideSlugsForDomain } from "@/lib/learn";
import { getAllFlashcards } from "@/lib/flashcards";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// Original, docs-grounded one-line outcomes (not copied from any third party).
const OUTCOME: Record<number, string> = {
  1: "Reason fluently about the agent loop, stop reasons, and orchestrator-worker decomposition.",
  2: "Design tool schemas and error contracts an LLM can call reliably, and map the MCP surface.",
  3: "Configure Claude Code memory, slash commands, hooks, permissions, and headless CI runs.",
  4: "Drive schema-valid structured output from the stateless Messages API with system prompts.",
  5: "Manage a finite context window, batch economically, and close evaluation loops.",
};

const flashcardCountByDomain: Record<number, number> = {};
for (const c of getAllFlashcards()) {
  flashcardCountByDomain[c.domain] = (flashcardCountByDomain[c.domain] ?? 0) + 1;
}

export function DomainCards() {
  const { mounted, snapshot } = useProgress();

  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {DOMAIN_INFO.map((d) => {
        const chapters = guideSlugsForDomain(d.domain).length;
        const cards = flashcardCountByDomain[d.domain] ?? 0;
        const m = snapshot.mastery.find((x) => x.domain === d.domain);
        const pct = mounted && m ? m.mastery : 0;
        const featured = d.domain === 1;
        return (
          <Link
            key={d.slug}
            href={`/learn/${d.slug}`}
            className={cn(featured && "sm:col-span-2 lg:col-span-2")}
          >
            <Card className="group h-full transition-all hover:-translate-y-1 hover:border-claude-orange/50 motion-reduce:transition-none motion-reduce:hover:translate-y-0">
              <CardContent className="flex h-full flex-col gap-3 p-6">
                <div className="flex items-start justify-between gap-3">
                  <span className="font-mono text-claude-orange">
                    D{d.domain}
                  </span>
                  <Badge variant="outline">{d.weight}% of exam</Badge>
                </div>
                <h3 className="font-display text-lg leading-tight">
                  {d.name}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {OUTCOME[d.domain]}
                </p>
                <div className="mt-auto space-y-2 pt-2">
                  <div className="flex items-center justify-between font-mono text-xs text-claude-muted">
                    <span>
                      {chapters} chapters · {cards} cards
                    </span>
                    <span>{pct}% mastery</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                    <div
                      className="h-full rounded-full bg-claude-orange transition-[width] duration-700 ease-out motion-reduce:transition-none"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="inline-flex items-center gap-1 text-sm text-claude-orange">
                    Start domain
                    <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none" />
                  </span>
                </div>
              </CardContent>
            </Card>
          </Link>
        );
      })}
    </div>
  );
}
