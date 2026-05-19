"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, RotateCcw, Stethoscope } from "lucide-react";

import { getAllQuestions, type Question } from "@/lib/questions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { QuestionCard } from "@/components/exam/QuestionCard";
import {
  DomainProgress,
  type DomainStat,
} from "@/components/exam/DomainProgress";
import { useProgress } from "@/components/progress/XpProvider";
import { getWeakAreas } from "@/lib/progress";
import { recommendedActionFor } from "@/lib/learn";
import { DOMAIN_META } from "@/data/scenarios";

// Pure client page, mounted-gated. Deterministic selection (no Math.random)
// keeps the render predictable and the route ○ Static.
export const dynamic = "force-static";

const TARGET_SIZE = 12;

/**
 * Deterministically order the question bank so the diagnostic prerenders
 * predictably and spans all five domains. We round-robin across domains
 * (sorted by ascending domain count then a stable id sort) so the picked
 * set is balanced even if the bank is small.
 */
function buildDiagnostic(all: Question[]): Question[] {
  const byDomain = new Map<number, Question[]>();
  for (const q of [...all].sort((a, b) => a.id.localeCompare(b.id))) {
    const list = byDomain.get(q.domain) ?? [];
    list.push(q);
    byDomain.set(q.domain, list);
  }
  const domains = [...byDomain.keys()].sort((a, b) => a - b);
  const picked: Question[] = [];
  let added = true;
  while (added && picked.length < TARGET_SIZE) {
    added = false;
    for (const d of domains) {
      const list = byDomain.get(d)!;
      if (list.length > 0 && picked.length < TARGET_SIZE) {
        picked.push(list.shift()!);
        added = true;
      }
    }
  }
  return picked;
}

type Phase = "intro" | "running" | "done";

export default function DiagnosticPage() {
  const { mounted, recordAttempt, snapshot } = useProgress();
  const deck = useMemo(() => buildDiagnostic(getAllQuestions()), []);

  const [phase, setPhase] = useState<Phase>("intro");
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [selected, setSelected] = useState<string | null>(null);
  const [answered, setAnswered] = useState(false);
  const recordedRef = useRef(false);

  const current = deck[index];

  const start = () => {
    setPhase("running");
    setIndex(0);
    setAnswers({});
    setSelected(null);
    setAnswered(false);
    recordedRef.current = false;
  };

  const onSelect = (label: string) => {
    if (answered || !current) return;
    setSelected(label);
    setAnswered(true);
    setAnswers((a) => ({ ...a, [current.id]: label }));
  };

  const onNext = () => {
    if (index + 1 >= deck.length) {
      setPhase("done");
      return;
    }
    setIndex((i) => i + 1);
    setSelected(null);
    setAnswered(false);
  };

  const { correct, domainStats } = useMemo(() => {
    let c = 0;
    const byDomain = new Map<number, { correct: number; total: number }>();
    for (const q of deck) {
      const ans = answers[q.id];
      const rec = byDomain.get(q.domain) ?? { correct: 0, total: 0 };
      rec.total += 1;
      if (ans === q.correct) {
        c += 1;
        rec.correct += 1;
      }
      byDomain.set(q.domain, rec);
    }
    const stats: DomainStat[] = Array.from(byDomain.entries()).map(
      ([domain, v]) => ({ domain, ...v })
    );
    return { correct: c, domainStats: stats };
  }, [deck, answers]);

  // Record exactly once when results render, mirroring the mock flow so the
  // attempt feeds mastery / streak / activity.
  useEffect(() => {
    if (phase !== "done" || recordedRef.current || deck.length === 0) return;
    recordedRef.current = true;
    const perDomain: Record<number, { correct: number; total: number }> = {};
    for (const d of domainStats) {
      perDomain[d.domain] = { correct: d.correct, total: d.total };
    }
    recordAttempt({
      scoreCorrect: correct,
      total: deck.length,
      perDomain,
      scenario: "Diagnostic",
      dateISO: new Date().toISOString(),
    });
  }, [phase, deck.length, domainStats, correct, recordAttempt]);

  const weak = phase === "done" ? getWeakAreas(snapshot.mastery) : [];
  const weakest = [...domainStats]
    .filter((d) => d.total > 0)
    .map((d) => ({ ...d, ratio: d.correct / d.total }))
    .sort((a, b) => a.ratio - b.ratio)[0];

  if (!mounted) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 px-4 py-12 sm:px-6">
        <div className="h-24 animate-pulse rounded-lg border border-border bg-card" />
        <div className="h-64 animate-pulse rounded-lg border border-border bg-card" />
      </div>
    );
  }

  const pct =
    deck.length > 0 ? Math.round((correct / deck.length) * 100) : 0;

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      {phase === "intro" && (
        <div className="space-y-6">
          <div>
            <h1 className="flex items-center gap-3 font-display text-4xl">
              <Stethoscope className="h-8 w-8 text-claude-orange" />
              Diagnostic
            </h1>
            <p className="mt-2 text-muted-foreground">
              A short {deck.length}-question check spanning all five domains.
              You get instant explanations, and the result feeds your mastery
              profile so the curriculum can point you at the right chapters.
            </p>
          </div>
          <Card>
            <CardContent className="space-y-4 p-6">
              <div className="flex flex-wrap gap-2">
                {[1, 2, 3, 4, 5].map((d) => {
                  const n = deck.filter((q) => q.domain === d).length;
                  return (
                    <Badge key={d} variant="outline">
                      D{d} · {n} q
                    </Badge>
                  );
                })}
              </div>
              <p className="text-sm text-muted-foreground">
                There is no timer. Answer honestly — the point is to surface
                gaps, not to score well.
              </p>
              <Button onClick={start}>
                Begin diagnostic
                <ArrowRight className="h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {phase === "running" && current && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <Badge variant="secondary">
              {index + 1} / {deck.length}
            </Badge>
            <span className="font-mono text-xs text-claude-muted">
              Diagnostic
            </span>
          </div>
          <QuestionCard
            question={current}
            index={index}
            total={deck.length}
            selected={selected}
            answered={answered}
            onSelect={onSelect}
            onNext={onNext}
            isLast={index + 1 >= deck.length}
          />
        </div>
      )}

      {phase === "done" && (
        <div className="space-y-6">
          <Card>
            <CardHeader className="items-center text-center">
              <Stethoscope className="h-9 w-9 text-claude-orange" />
              <CardTitle className="font-display text-4xl">{pct}%</CardTitle>
              <p className="text-sm text-muted-foreground">
                {correct} of {deck.length} correct · result recorded to your
                mastery profile
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              {weakest && weakest.ratio < 1 && (
                <Alert variant="warning">
                  <AlertTitle>Weakest domain</AlertTitle>
                  <AlertDescription>
                    You scored lowest on{" "}
                    <strong>
                      D{weakest.domain}{" "}
                      {DOMAIN_META[weakest.domain]?.name}
                    </strong>{" "}
                    ({weakest.correct}/{weakest.total}). Start there.
                  </AlertDescription>
                </Alert>
              )}

              <div>
                <h3 className="mb-3 font-mono text-xs uppercase tracking-wider text-claude-muted">
                  Per-domain gap analysis
                </h3>
                <DomainProgress stats={domainStats} />
              </div>

              {weak.length > 0 && (
                <div>
                  <h3 className="mb-3 font-mono text-xs uppercase tracking-wider text-claude-muted">
                    Study next
                  </h3>
                  <div className="space-y-2">
                    {weak.map((w) => {
                      const action = recommendedActionFor(w);
                      return (
                        <div
                          key={w.domain}
                          className="flex flex-col gap-3 rounded-md border border-border p-4 sm:flex-row sm:items-center sm:justify-between"
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-claude-orange">
                                D{w.domain}
                              </span>
                              <span className="truncate text-sm">
                                {DOMAIN_META[w.domain]?.name}
                              </span>
                              <Badge variant="outline">
                                {w.mastery}% mastery
                              </Badge>
                            </div>
                            <p className="mt-1 text-xs text-muted-foreground">
                              {action.label}
                            </p>
                          </div>
                          <Button asChild size="sm" className="shrink-0">
                            <Link href={action.href}>
                              Go
                              <ArrowRight className="h-4 w-4" />
                            </Link>
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="flex flex-wrap gap-3">
                <Button onClick={() => setPhase("intro")}>
                  <RotateCcw className="h-4 w-4" />
                  Retake
                </Button>
                <Button asChild variant="outline">
                  <Link href="/learn">Open curriculum</Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href="/mock-exam">Full mock exam</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
