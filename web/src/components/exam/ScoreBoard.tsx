"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Compass, RotateCcw, Trophy, Users } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { DOMAIN_META } from "@/data/scenarios";
import { useProgress } from "@/components/progress/XpProvider";
import { ShareCard, REPO_URL } from "@/components/share/ShareCard";
import { PASS_THRESHOLD_PCT } from "@/lib/progress";
import { DomainProgress, type DomainStat } from "./DomainProgress";

interface ScoreBoardProps {
  correct: number;
  total: number;
  domainStats: DomainStat[];
  scenario: string;
  onRetry: () => void;
}

export function ScoreBoard({
  correct,
  total,
  domainStats,
  scenario,
  onRetry,
}: ScoreBoardProps) {
  const pct = total > 0 ? Math.round((correct / total) * 100) : 0;
  const passed = pct >= PASS_THRESHOLD_PCT;

  const { recordAttempt, snapshot } = useProgress();
  const [xpEarned, setXpEarned] = useState(0);
  const [challengeCopied, setChallengeCopied] = useState(false);
  // Guard so the attempt is recorded exactly once per mount, even though
  // the parent re-renders this component on state changes.
  const recordedRef = useRef(false);

  useEffect(() => {
    if (recordedRef.current || total === 0) return;
    recordedRef.current = true;
    const perDomain: Record<number, { correct: number; total: number }> = {};
    for (const d of domainStats) {
      perDomain[d.domain] = { correct: d.correct, total: d.total };
    }
    const res = recordAttempt({
      scoreCorrect: correct,
      total,
      perDomain,
      scenario,
      dateISO: new Date().toISOString(),
    });
    setXpEarned(res.xpEarned);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const weakest = [...domainStats]
    .filter((d) => d.total > 0)
    .map((d) => ({ ...d, ratio: d.correct / d.total }))
    .sort((a, b) => a.ratio - b.ratio)[0];

  const perDomainForCard: Record<
    number,
    { correct: number; total: number }
  > = {};
  for (const d of domainStats) {
    perDomainForCard[d.domain] = { correct: d.correct, total: d.total };
  }

  const challenge = async () => {
    const text = `I scored ${correct}/${total} on the free CCAF mock exam. Can you beat it? ${REPO_URL}/web/mock-exam`;
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(text);
        setChallengeCopied(true);
        window.setTimeout(() => setChallengeCopied(false), 1800);
      } else if (typeof window !== "undefined") {
        window.open(
          `https://twitter.com/intent/tweet?text=${encodeURIComponent(
            text
          )}`,
          "_blank",
          "noopener,noreferrer"
        );
      }
    } catch {
      /* ignore */
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
            {passed
              ? "Above pass proxy"
              : `Below ${PASS_THRESHOLD_PCT}% pass proxy`}
          </p>
          {xpEarned > 0 && (
            <p className="font-mono text-xs text-claude-orange">
              +{xpEarned} XP · {snapshot.rank.name}
            </p>
          )}
        </CardHeader>
        <CardContent className="space-y-6">
          <Alert>
            <AlertTitle>Unofficial pass proxy</AlertTitle>
            <AlertDescription>
              CCAF reports a scaled score, not a raw percentage. This site
              treats <strong>≥{PASS_THRESHOLD_PCT}%</strong> as a practice
              pass proxy — it is not the official scaled result.
            </AlertDescription>
          </Alert>

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
              Retake
            </Button>
            <Button variant="outline" onClick={challenge}>
              <Users className="h-4 w-4" />
              {challengeCopied ? "Link copied!" : "Challenge a friend"}
            </Button>
            <Button asChild variant="outline">
              <Link href="/learn">
                <Compass className="h-4 w-4" />
                See study plan
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-display text-2xl">
            Share your result
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ShareCard
            variant="mock-result"
            scoreCorrect={correct}
            total={total}
            perDomain={perDomainForCard}
            passed={passed}
            badgeLabels={snapshot.badges.map((b) => b.label)}
          />
        </CardContent>
      </Card>
    </div>
  );
}
