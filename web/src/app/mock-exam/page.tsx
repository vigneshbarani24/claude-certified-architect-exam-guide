"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Flag, CheckCircle2, Circle } from "lucide-react";

import {
  getAllQuestions,
  filterByScenarios,
  shuffle,
  type Question,
} from "@/lib/questions";
import { SCENARIOS } from "@/data/scenarios";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { QuestionCard } from "@/components/exam/QuestionCard";
import { ScoreBoard } from "@/components/exam/ScoreBoard";
import type { DomainStat } from "@/components/exam/DomainProgress";
import { ExamTimer } from "@/components/exam/ExamTimer";
import { cn } from "@/lib/utils";

type Phase = "setup" | "running" | "review" | "done";

function MockExamInner() {
  const params = useSearchParams();
  const allScenarios = SCENARIOS.map((s) => s.title);
  const [phase, setPhase] = useState<Phase>("setup");
  const [selectedScenarios, setSelectedScenarios] = useState<string[]>([]);
  const [useTimer, setUseTimer] = useState(false);
  const [deck, setDeck] = useState<Question[]>([]);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [flags, setFlags] = useState<Record<string, boolean>>({});
  const [selected, setSelected] = useState<string | null>(null);
  const [answered, setAnswered] = useState(false);

  const toggleScenario = (title: string) => {
    setSelectedScenarios((prev) =>
      prev.includes(title)
        ? prev.filter((t) => t !== title)
        : [...prev, title]
    );
  };

  const [scenarioLabel, setScenarioLabel] = useState("All scenarios");

  const launch = (pool: Question[], label: string) => {
    setScenarioLabel(label);
    setDeck(shuffle(pool));
    setIndex(0);
    setAnswers({});
    setFlags({});
    setSelected(null);
    setAnswered(false);
    setPhase("running");
  };

  const startExam = (mode: "selected" | "random4" | "all") => {
    let scenarios: string[];
    if (mode === "all") scenarios = allScenarios;
    else if (mode === "random4")
      scenarios = shuffle(allScenarios).slice(0, 4);
    else
      scenarios =
        selectedScenarios.length > 0 ? selectedScenarios : allScenarios;

    const pool =
      mode === "all" ? getAllQuestions() : filterByScenarios(scenarios);
    const label =
      mode === "all"
        ? "All 6 scenarios"
        : mode === "random4"
          ? "4 random scenarios"
          : scenarios.length === 1
            ? scenarios[0]
            : `${scenarios.length} scenarios`;
    launch(pool, label);
  };

  // Auto-start a single scenario when arriving via /mock-exam?scenario=<id>
  // (deep link from /learn). Runs exactly once.
  const autoStartedRef = useRef(false);
  useEffect(() => {
    if (autoStartedRef.current) return;
    const sid = params.get("scenario");
    if (!sid) return;
    const scenario = SCENARIOS.find((s) => s.id === sid);
    if (!scenario) return;
    autoStartedRef.current = true;
    const pool = filterByScenarios([scenario.title]);
    if (pool.length === 0) return;
    setSelectedScenarios([scenario.title]);
    launch(pool, scenario.title);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const current = deck[index];

  const onSelect = (label: string) => {
    if (answered || !current) return;
    setSelected(label);
    setAnswered(true);
    setAnswers((a) => ({ ...a, [current.id]: label }));
  };

  const goTo = (i: number) => {
    setIndex(i);
    const q = deck[i];
    const prev = q ? answers[q.id] : undefined;
    setSelected(prev ?? null);
    setAnswered(prev !== undefined);
  };

  const onNext = () => {
    if (index + 1 >= deck.length) {
      setPhase("review");
      return;
    }
    goTo(index + 1);
  };

  const toggleFlag = () => {
    if (!current) return;
    setFlags((f) => ({ ...f, [current.id]: !f[current.id] }));
  };

  // Timer expiry → score immediately (auto-submit) from wherever we are.
  const submit = () => setPhase("done");

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

  const reset = () => {
    setPhase("setup");
    setDeck([]);
    setAnswers({});
    setFlags({});
  };

  const answeredCount = Object.keys(answers).length;
  const flaggedCount = Object.values(flags).filter(Boolean).length;

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      {phase === "setup" && (
        <div className="space-y-8">
          <div>
            <h1 className="font-display text-4xl">Mock Exam</h1>
            <p className="mt-2 text-muted-foreground">
              Pick scenarios, optionally start a timer, flag tricky questions,
              and review before you submit.
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="font-display">Scenarios</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {SCENARIOS.map((s) => {
                  const on = selectedScenarios.includes(s.title);
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => toggleScenario(s.title)}
                      className={cn(
                        "rounded-md border px-3 py-2 text-sm transition-colors",
                        on
                          ? "border-claude-orange bg-claude-orange/10 text-foreground"
                          : "border-border text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {s.title}
                    </button>
                  );
                })}
              </div>

              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={useTimer}
                  onChange={(e) => setUseTimer(e.target.checked)}
                  className="h-4 w-4 accent-[var(--claude-orange)]"
                />
                Enable 30-minute timer (auto-submits at zero)
              </label>

              <div className="flex flex-wrap gap-3 pt-2">
                <Button onClick={() => startExam("selected")}>
                  Start selected
                </Button>
                <Button
                  variant="outline"
                  onClick={() => startExam("random4")}
                >
                  4 random scenarios
                </Button>
                <Button variant="outline" onClick={() => startExam("all")}>
                  All 6 scenarios
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {phase === "running" && current && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <Badge variant="secondary">
              {index + 1} of {deck.length}
            </Badge>
            <div className="flex items-center gap-3">
              {useTimer && <ExamTimer minutes={30} onExpire={submit} />}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setPhase("review")}
              >
                Review &amp; submit
              </Button>
            </div>
          </div>

          {/* Progress bar with answered + flagged markers. */}
          <div
            className="flex gap-1"
            role="img"
            aria-label={`${answeredCount} of ${deck.length} answered, ${flaggedCount} flagged`}
          >
            {deck.map((q, i) => {
              const isAnswered = answers[q.id] !== undefined;
              const isFlagged = flags[q.id];
              return (
                <button
                  key={q.id}
                  type="button"
                  onClick={() => goTo(i)}
                  aria-label={`Go to question ${i + 1}`}
                  className={cn(
                    "h-1.5 flex-1 rounded-full transition-colors",
                    i === index
                      ? "bg-claude-orange"
                      : isFlagged
                        ? "bg-amber-500/70"
                        : isAnswered
                          ? "bg-claude-orange/40"
                          : "bg-secondary"
                  )}
                />
              );
            })}
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
            flagged={!!flags[current.id]}
            onToggleFlag={toggleFlag}
            lastLabel="Review answers"
          />

          <p className="text-center font-mono text-xs text-claude-muted">
            Keys: A–D or 1–4 select · Enter next · F flag
          </p>
        </div>
      )}

      {phase === "review" && (
        <div className="space-y-6">
          <div>
            <h1 className="font-display text-3xl">Review before submitting</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {answeredCount} of {deck.length} answered · {flaggedCount}{" "}
              flagged. Jump back to any question, or submit to score.
            </p>
          </div>

          <Card>
            <CardContent className="space-y-2 p-4">
              {deck.map((q, i) => {
                const isAnswered = answers[q.id] !== undefined;
                const isFlagged = flags[q.id];
                return (
                  <button
                    key={q.id}
                    type="button"
                    onClick={() => {
                      goTo(i);
                      setPhase("running");
                    }}
                    className="flex w-full items-center justify-between gap-3 rounded-md border border-border px-3 py-2 text-left text-sm transition-colors hover:border-claude-orange/50"
                  >
                    <span className="flex items-center gap-2 truncate">
                      <span className="font-mono text-xs text-claude-muted">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <span className="truncate">{q.stem}</span>
                    </span>
                    <span className="flex shrink-0 items-center gap-2">
                      {isFlagged && (
                        <Flag className="h-4 w-4 text-amber-500" />
                      )}
                      {isAnswered ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      ) : (
                        <Circle className="h-4 w-4 text-muted-foreground" />
                      )}
                    </span>
                  </button>
                );
              })}
            </CardContent>
          </Card>

          <div className="flex flex-wrap gap-3">
            <Button onClick={submit}>Submit &amp; score</Button>
            <Button
              variant="outline"
              onClick={() => {
                // Jump to the first unanswered question if any.
                const firstUnanswered = deck.findIndex(
                  (q) => answers[q.id] === undefined
                );
                goTo(firstUnanswered >= 0 ? firstUnanswered : 0);
                setPhase("running");
              }}
            >
              Back to questions
            </Button>
          </div>
        </div>
      )}

      {phase === "done" && (
        <ScoreBoard
          correct={correct}
          total={deck.length}
          domainStats={domainStats}
          scenario={scenarioLabel}
          onRetry={reset}
        />
      )}
    </div>
  );
}

export default function MockExamPage() {
  return (
    <Suspense fallback={null}>
      <MockExamInner />
    </Suspense>
  );
}
