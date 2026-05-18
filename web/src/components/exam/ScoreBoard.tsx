"use client";

import { RotateCcw, Share2, Trophy } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { DOMAIN_META } from "@/data/scenarios";
import { DomainProgress, type DomainStat } from "./DomainProgress";

interface ScoreBoardProps {
  correct: number;
  total: number;
  domainStats: DomainStat[];
  onRetry: () => void;
}

export function ScoreBoard({
  correct,
  total,
  domainStats,
  onRetry,
}: ScoreBoardProps) {
  const pct = total > 0 ? Math.round((correct / total) * 100) : 0;
  const passed = pct >= 70;

  const weakest = [...domainStats]
    .filter((d) => d.total > 0)
    .map((d) => ({ ...d, ratio: d.correct / d.total }))
    .sort((a, b) => a.ratio - b.ratio)[0];

  const share = () => {
    const text = `I scored ${pct}% on the CCAF mock exam.`;
    if (typeof navigator !== "undefined" && navigator.share) {
      navigator.share({ title: "CCAF Mock Exam", text }).catch(() => {});
    } else if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(text).catch(() => {});
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Card>
        <CardHeader className="items-center text-center">
          <Trophy
            className={
              passed
                ? "h-10 w-10 text-claude-orange"
                : "h-10 w-10 text-muted-foreground"
            }
          />
          <CardTitle className="font-display text-4xl">{pct}%</CardTitle>
          <p className="text-sm text-muted-foreground">
            {correct} of {total} correct ·{" "}
            {passed ? "Passing range" : "Below 70% target"}
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {weakest && weakest.ratio < 1 && (
            <Alert variant="warning">
              <AlertTitle>Focus area</AlertTitle>
              <AlertDescription>
                Your weakest domain was{" "}
                <strong>
                  D{weakest.domain} {DOMAIN_META[weakest.domain]?.name}
                </strong>{" "}
                ({weakest.correct}/{weakest.total}). Review that section in the
                guide and drill its flashcards.
              </AlertDescription>
            </Alert>
          )}

          <div>
            <h3 className="mb-3 font-mono text-xs uppercase tracking-wider text-claude-muted">
              Per-domain breakdown
            </h3>
            <DomainProgress stats={domainStats} />
          </div>

          <div className="flex flex-wrap gap-3">
            <Button onClick={onRetry}>
              <RotateCcw className="h-4 w-4" />
              Retry
            </Button>
            <Button variant="outline" onClick={share}>
              <Share2 className="h-4 w-4" />
              Share score
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
