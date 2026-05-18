"use client";

import Link from "next/link";
import { useMemo } from "react";
import { ArrowRight, CalendarDays } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useProgress } from "@/components/progress/XpProvider";
import type { DailyActivity } from "@/lib/progress";
import { HeatmapCell } from "./HeatmapCell";

const WEEKS = 16;

function dateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function continueTarget(
  resume: ReturnType<typeof useProgress>["snapshot"]["resume"]
): { href: string; label: string } | null {
  if (resume.drill) {
    const params = new URLSearchParams();
    if (resume.drill.domain !== "all")
      params.set("domain", String(resume.drill.domain));
    if (resume.drill.difficulty !== "all")
      params.set("difficulty", resume.drill.difficulty);
    if (resume.drill.dueOnly) params.set("due", "1");
    if (resume.drill.index > 0)
      params.set("index", String(resume.drill.index));
    const qs = params.toString();
    return {
      href: `/flashcards${qs ? `?${qs}` : ""}`,
      label: "Resume your flashcard drill",
    };
  }
  if (resume.lastGuideSectionId) {
    return {
      href: `/guide#${resume.lastGuideSectionId}`,
      label: "Continue reading the guide",
    };
  }
  return null;
}

export function StudyHistory() {
  const { snapshot } = useProgress();
  const log = snapshot.activityLog;

  // Build a WEEKS×7 grid ending today (columns = weeks, rows = weekday).
  const columns = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    // Start on the Sunday WEEKS-1 weeks before the current week's Sunday.
    const start = new Date(today);
    start.setDate(start.getDate() - start.getDay() - (WEEKS - 1) * 7);
    const cols: { key: string; day: number; act: DailyActivity }[][] = [];
    for (let w = 0; w < WEEKS; w++) {
      const col: { key: string; day: number; act: DailyActivity }[] = [];
      for (let d = 0; d < 7; d++) {
        const cell = new Date(start);
        cell.setDate(start.getDate() + w * 7 + d);
        const key = dateKey(cell);
        const act: DailyActivity = log[key] ?? {
          cardsReviewed: 0,
          questionsAnswered: 0,
          sectionsRead: 0,
          xpEarned: 0,
        };
        col.push({ key, day: d, act });
      }
      cols.push(col);
    }
    return cols;
  }, [log]);

  // Sparkline over recent mock attempt percentages.
  const points = useMemo(() => {
    const recent = snapshot.attempts.slice(-12);
    return recent.map((a) =>
      a.total > 0 ? Math.round((a.scoreCorrect / a.total) * 100) : 0
    );
  }, [snapshot.attempts]);

  const cont = continueTarget(snapshot.resume);

  const W = 240;
  const H = 56;
  const sparkPath =
    points.length > 1
      ? points
          .map((p, i) => {
            const x = (i / (points.length - 1)) * W;
            const y = H - (p / 100) * H;
            return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
          })
          .join(" ")
      : "";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-display text-2xl">
          <CalendarDays className="h-5 w-5 text-claude-orange" />
          Study history
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-8">
        {cont && (
          <div className="flex flex-col gap-3 rounded-md border border-claude-orange/40 bg-claude-orange/5 p-4 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-sm text-foreground">{cont.label}</span>
            <Button asChild size="sm" className="shrink-0">
              <Link href={cont.href}>
                Continue
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        )}

        <div>
          <p className="mb-3 font-mono text-xs uppercase tracking-wider text-claude-muted">
            Last {WEEKS} weeks · daily XP
          </p>
          <TooltipProvider delayDuration={100}>
            <div className="flex gap-1 overflow-x-auto pb-1">
              {columns.map((col, ci) => (
                <div key={ci} className="flex flex-col gap-1">
                  {col.map((cell) => (
                    <HeatmapCell
                      key={cell.key}
                      dateISO={cell.key}
                      xp={cell.act.xpEarned}
                      cards={cell.act.cardsReviewed}
                      questions={cell.act.questionsAnswered}
                      sections={cell.act.sectionsRead}
                    />
                  ))}
                </div>
              ))}
            </div>
          </TooltipProvider>
          <div className="mt-3 flex items-center gap-2 font-mono text-[10px] text-claude-muted">
            <span>less</span>
            <span className="h-3 w-3 rounded-[2px] bg-secondary" />
            <span className="h-3 w-3 rounded-[2px] bg-claude-orange/20" />
            <span className="h-3 w-3 rounded-[2px] bg-claude-orange/40" />
            <span className="h-3 w-3 rounded-[2px] bg-claude-orange/70" />
            <span className="h-3 w-3 rounded-[2px] bg-claude-orange" />
            <span>more</span>
          </div>
        </div>

        <div>
          <p className="mb-3 font-mono text-xs uppercase tracking-wider text-claude-muted">
            Recent mock scores
          </p>
          {points.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No mock attempts yet.
            </p>
          ) : points.length === 1 ? (
            <p className="font-mono text-2xl text-claude-orange">
              {points[0]}%
            </p>
          ) : (
            <svg
              viewBox={`0 0 ${W} ${H}`}
              className="h-14 w-full max-w-sm"
              role="img"
              aria-label="Recent mock score trend"
            >
              <polyline
                points={points
                  .map((p, i) => {
                    const x = (i / (points.length - 1)) * W;
                    const y = H - (p / 100) * H;
                    return `${x.toFixed(1)},${y.toFixed(1)}`;
                  })
                  .join(" ")}
                fill="none"
                stroke="var(--claude-orange)"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
              />
              <path
                d={`${sparkPath} L${W},${H} L0,${H} Z`}
                fill="var(--claude-orange)"
                opacity={0.12}
              />
            </svg>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
