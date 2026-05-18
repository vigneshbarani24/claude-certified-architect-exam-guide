"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";

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

type Phase = "setup" | "running" | "done";

function MockExamInner() {
  const params = useSearchParams();
  const allScenarios = SCENARIOS.map((s) => s.title);
  const [phase, setPhase] = useState<Phase>("setup");
  const [selectedScenarios, setSelectedScenarios] = useState<string[]>([]);
  const [useTimer, setUseTimer] = useState(false);
  const [deck, setDeck] = useState<Question[]>([]);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
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

  const startExam = (mode: "selected" | "random4" | "all") => {
    let scenarios: string[];
    if (mode === "all") scenarios = allScenarios;
    else if (mode === "random4")
      scenarios = shuffle(allScenarios).slice(0, 4);
    else
      scenarios =
        selectedScenarios.length > 0 ? selectedScenarios : allScenarios;

    const pool =
      mode === "all"
        ? getAllQuestions()
        : filterByScenarios(scenarios);
    setScenarioLabel(
      mode === "all"
        ? "All 6 scenarios"
        : mode === "random4"
          ? "4 random scenarios"
          : scenarios.length === 1
            ? scenarios[0]
            : `${scenarios.length} scenarios`
    );
    setDeck(shuffle(pool));
    setIndex(0);
    setAnswers({});
    setSelected(null);
    setAnswered(false);
    setPhase("running");
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
    setScenarioLabel(scenario.title);
    setDeck(shuffle(pool));
    setIndex(0);
    setAnswers({});
    setSelected(null);
    setAnswered(false);
    setPhase("running");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const current = deck[index];

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

  const finishNow = () => setPhase("done");

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
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      {phase === "setup" && (
        <div className="space-y-8">
          <div>
            <h1 className="font-display text-4xl">Mock Exam</h1>
            <p className="mt-2 text-muted-foreground">
              Pick scenarios, optionally start a timer, and answer
              scenario-based questions with instant feedback.
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
                Enable 30-minute timer
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
                <Button
                  variant="outline"
                  onClick={() => startExam("all")}
                >
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
              {index + 1} / {deck.length}
            </Badge>
            <div className="flex items-center gap-3">
              {useTimer && (
                <ExamTimer minutes={30} onExpire={finishNow} />
              )}
              <Button variant="ghost" size="sm" onClick={finishNow}>
                End exam
              </Button>
            </div>
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
