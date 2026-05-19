"use client";

import { useEffect, useMemo } from "react";
import { CheckCircle2, XCircle, Flag } from "lucide-react";

import type { Question } from "@/lib/questions";
import { DOMAIN_META } from "@/data/scenarios";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface QuestionCardProps {
  question: Question;
  index: number;
  total: number;
  selected: string | null;
  answered: boolean;
  onSelect: (label: string) => void;
  onNext: () => void;
  isLast: boolean;
  /** Optional flag-for-review controls (mock exam). */
  flagged?: boolean;
  onToggleFlag?: () => void;
  /** Label for the advance button on the last question. */
  lastLabel?: string;
}

const POSITION_LETTERS = ["A", "B", "C", "D", "E", "F"] as const;

export function QuestionCard({
  question,
  index,
  total,
  selected,
  answered,
  onSelect,
  onNext,
  isLast,
  flagged,
  onToggleFlag,
  lastLabel = "See results",
}: QuestionCardProps) {
  // Render options strictly in label order (A→B→C→D). The displayed letter is
  // the POSITION, which — because we sort by the stored label — always equals
  // the option's own label. This makes a "A, D, C, B" display impossible even
  // if the source array were ever out of order. `correct` references the
  // stored label, so scoring is unaffected by this presentation sort.
  const orderedOptions = useMemo(
    () =>
      [...question.options].sort((a, b) => a.label.localeCompare(b.label)),
    [question.options]
  );

  // Keyboard: A–D or 1–4 to select, Enter to advance (once answered),
  // F to toggle flag. Consistent with the DrillMode key conventions.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;

      if (!answered) {
        let pos = -1;
        if (/^[a-dA-D]$/.test(e.key)) {
          pos = e.key.toUpperCase().charCodeAt(0) - 65;
        } else if (/^[1-4]$/.test(e.key)) {
          pos = Number(e.key) - 1;
        }
        if (pos >= 0 && pos < orderedOptions.length) {
          e.preventDefault();
          onSelect(orderedOptions[pos].label);
          return;
        }
      }
      if (answered && (e.key === "Enter" || e.code === "NumpadEnter")) {
        e.preventDefault();
        onNext();
        return;
      }
      if (
        onToggleFlag &&
        (e.key === "f" || e.key === "F") &&
        !e.metaKey &&
        !e.ctrlKey
      ) {
        e.preventDefault();
        onToggleFlag();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [answered, orderedOptions, onSelect, onNext, onToggleFlag]);

  return (
    <Card className="w-full">
      <CardHeader className="gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="font-mono text-xs text-claude-muted">
            Question {index + 1} of {total}
          </span>
          <div className="flex items-center gap-2">
            {onToggleFlag && (
              <button
                type="button"
                onClick={onToggleFlag}
                aria-pressed={!!flagged}
                aria-label={flagged ? "Unflag question" : "Flag for review"}
                className={cn(
                  "flex items-center gap-1 rounded-md border px-2 py-1 font-mono text-xs transition-colors",
                  flagged
                    ? "border-claude-orange bg-claude-orange/10 text-claude-orange"
                    : "border-border text-muted-foreground hover:text-foreground"
                )}
              >
                <Flag className="h-3.5 w-3.5" />
                {flagged ? "Flagged" : "Flag"}
              </button>
            )}
            <Badge variant="secondary">{question.scenario}</Badge>
            <Badge variant="outline">
              D{question.domain} · {DOMAIN_META[question.domain]?.name}
            </Badge>
          </div>
        </div>
        <h2 className="text-lg font-medium leading-relaxed text-foreground">
          {question.stem}
        </h2>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-2">
          {orderedOptions.map((opt, pos) => {
            const letter = POSITION_LETTERS[pos];
            const isCorrect = opt.label === question.correct;
            const isChosen = opt.label === selected;
            return (
              <button
                key={opt.label}
                type="button"
                disabled={answered}
                onClick={() => onSelect(opt.label)}
                className={cn(
                  "flex w-full items-start gap-3 rounded-md border p-3 text-left text-sm transition-colors",
                  !answered &&
                    "border-border hover:border-claude-orange/60 hover:bg-secondary",
                  answered &&
                    isCorrect &&
                    "border-emerald-600/60 bg-emerald-950/30",
                  answered &&
                    isChosen &&
                    !isCorrect &&
                    "border-destructive/60 bg-destructive/10",
                  answered &&
                    !isCorrect &&
                    !isChosen &&
                    "border-border opacity-60"
                )}
              >
                <span className="font-mono text-xs font-semibold text-claude-orange">
                  {letter}
                </span>
                <span className="flex-1">{opt.text}</span>
                {answered && isCorrect && (
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                )}
                {answered && isChosen && !isCorrect && (
                  <XCircle className="h-4 w-4 shrink-0 text-destructive" />
                )}
              </button>
            );
          })}
        </div>

        {answered && (
          <div className="space-y-3 rounded-md border border-border bg-secondary/50 p-4">
            <div className="flex items-center gap-2 text-sm font-medium">
              {selected === question.correct ? (
                <span className="text-emerald-500">Correct</span>
              ) : (
                <span className="text-destructive">
                  Incorrect — correct answer is {question.correct}
                </span>
              )}
            </div>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {question.explanation}
            </p>
            <div className="flex justify-end">
              <Button onClick={onNext}>
                {isLast ? lastLabel : "Next question"}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
