"use client";

import Link from "next/link";
import { ArrowLeft, ArrowRight, Layers, ListChecks, Target } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useProgress } from "@/components/progress/XpProvider";
import { getAllFlashcards } from "@/lib/flashcards";
import { getDueCardIds } from "@/lib/progress";
import { SCENARIOS } from "@/data/scenarios";

interface DomainPracticeProps {
  domain: number;
  prev: { slug: string; name: string } | null;
  next: { slug: string; name: string } | null;
}

const DOMAIN_CARD_IDS: Record<number, string[]> = (() => {
  const map: Record<number, string[]> = {};
  for (const c of getAllFlashcards()) {
    (map[c.domain] ??= []).push(c.id);
  }
  return map;
})();

export function DomainPractice({ domain, prev, next }: DomainPracticeProps) {
  const { mounted, snapshot } = useProgress();

  const mastery =
    mounted && snapshot.mastery.find((m) => m.domain === domain)
      ? snapshot.mastery.find((m) => m.domain === domain)!.mastery
      : null;

  const cardIds = DOMAIN_CARD_IDS[domain] ?? [];
  const due = mounted ? getDueCardIds(cardIds).length : 0;

  const scenarios = SCENARIOS.filter((s) =>
    s.primaryDomains.includes(domain)
  );

  return (
    <Card className="lg:sticky lg:top-24">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-display text-xl">
          <Target className="h-5 w-5 text-claude-orange" />
          Practice this domain
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div>
          <div className="flex items-baseline justify-between">
            <span className="font-mono text-xs uppercase tracking-wider text-claude-muted">
              Mastery
            </span>
            <span className="font-mono text-lg text-claude-orange">
              {mastery === null ? "—" : `${mastery}%`}
            </span>
          </div>
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full rounded-full bg-claude-orange transition-[width] duration-700"
              style={{ width: mastery === null ? "0%" : `${mastery}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            {mastery === null
              ? "Drill cards and sit mock scenarios to build a mastery profile."
              : "Composite of cards reviewed, mock results, and guide reading."}
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <Button asChild size="sm">
            <Link href={`/flashcards?domain=${domain}`}>
              <Layers className="h-4 w-4" />
              Drill D{domain} flashcards
            </Link>
          </Button>
          {mounted && due > 0 && (
            <Button asChild size="sm" variant="outline">
              <Link href={`/flashcards?domain=${domain}&due=1`}>
                Review {due} due D{domain} card{due === 1 ? "" : "s"}
              </Link>
            </Button>
          )}
        </div>

        {scenarios.length > 0 && (
          <div>
            <p className="mb-2 font-mono text-xs uppercase tracking-wider text-claude-muted">
              Mock scenarios
            </p>
            <div className="flex flex-col gap-2">
              {scenarios.map((s) => (
                <Button
                  key={s.id}
                  asChild
                  size="sm"
                  variant="outline"
                  className="justify-start"
                >
                  <Link href={`/mock-exam?scenario=${s.id}`}>
                    <ListChecks className="h-4 w-4" />
                    <span className="truncate">{s.title}</span>
                  </Link>
                </Button>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center justify-between gap-2 border-t border-border pt-4">
          {prev ? (
            <Button asChild variant="ghost" size="sm">
              <Link href={`/learn/${prev.slug}`}>
                <ArrowLeft className="h-4 w-4" />
                <span className="hidden sm:inline">Prev</span>
              </Link>
            </Button>
          ) : (
            <span />
          )}
          <Button asChild variant="ghost" size="sm">
            <Link href="/learn">
              <Badge variant="outline">All domains</Badge>
            </Link>
          </Button>
          {next ? (
            <Button asChild variant="ghost" size="sm">
              <Link href={`/learn/${next.slug}`}>
                <span className="hidden sm:inline">Next</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          ) : (
            <span />
          )}
        </div>
      </CardContent>
    </Card>
  );
}
