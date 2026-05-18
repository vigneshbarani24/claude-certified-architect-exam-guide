"use client";

import { CheckCircle2, XCircle } from "lucide-react";

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
}

export function QuestionCard({
  question,
  index,
  total,
  selected,
  answered,
  onSelect,
  onNext,
  isLast,
}: QuestionCardProps) {
  return (
    <Card className="w-full">
      <CardHeader className="gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="font-mono text-xs text-claude-muted">
            Question {index + 1} / {total}
          </span>
          <div className="flex gap-2">
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
          {question.options.map((opt) => {
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
                  {opt.label}
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
                {isLast ? "See Results" : "Next Question"}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
