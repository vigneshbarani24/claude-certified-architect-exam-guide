"use client";

import Link from "next/link";
import {
  ArrowRight,
  Flame,
  Stethoscope,
  Layers,
  Trophy,
} from "lucide-react";

import { useProgress } from "@/components/progress/XpProvider";
import { DOMAIN_INFO } from "@/lib/learn";
import { Button } from "@/components/ui/button";

const RING_SIZE = 116;
const RING_STROKE = 8;
const RADIUS = (RING_SIZE - RING_STROKE) / 2;
const CIRC = 2 * Math.PI * RADIUS;

function readinessStatus(pct: number): {
  label: string;
  className: string;
} {
  if (pct >= 75)
    return {
      label: "Exam-Ready",
      className: "border-emerald-600/50 bg-emerald-950/30 text-emerald-400",
    };
  if (pct >= 40)
    return {
      label: "Building",
      className: "border-claude-orange/50 bg-claude-orange/10 text-claude-orange",
    };
  return {
    label: "Not Ready",
    className: "border-border bg-secondary text-muted-foreground",
  };
}

function MasteryRing({
  domain,
  pct,
}: {
  domain: number;
  pct: number;
}) {
  const offset = CIRC - (pct / 100) * CIRC;
  return (
    <Link
      href={`/learn/${DOMAIN_INFO.find((d) => d.domain === domain)?.slug ?? ""}`}
      className="group flex flex-col items-center gap-1"
      aria-label={`Domain ${domain} mastery ${pct} percent`}
    >
      <div className="relative h-12 w-12">
        <svg
          viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`}
          className="h-full w-full -rotate-90"
        >
          <circle
            cx={RING_SIZE / 2}
            cy={RING_SIZE / 2}
            r={RADIUS}
            fill="none"
            stroke="hsl(var(--secondary))"
            strokeWidth={RING_STROKE}
          />
          <circle
            cx={RING_SIZE / 2}
            cy={RING_SIZE / 2}
            r={RADIUS}
            fill="none"
            stroke="var(--claude-orange)"
            strokeWidth={RING_STROKE}
            strokeLinecap="round"
            strokeDasharray={CIRC}
            strokeDashoffset={offset}
            className="transition-[stroke-dashoffset] duration-700 ease-out motion-reduce:transition-none"
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center font-mono text-[10px] text-foreground">
          D{domain}
        </span>
      </div>
      <span className="font-mono text-[11px] text-muted-foreground group-hover:text-foreground">
        {pct}%
      </span>
    </Link>
  );
}

export function ReadinessHero() {
  const { mounted, snapshot } = useProgress();

  // Hydration-safe neutral placeholder until mounted (mirrors XpChip).
  if (!mounted) {
    return (
      <div
        className="h-[420px] w-full animate-pulse rounded-lg border border-border bg-card"
        aria-hidden
      />
    );
  }

  const mastery = snapshot.mastery;
  const overall =
    mastery.length > 0
      ? Math.round(
          mastery.reduce((sum, m) => sum + m.mastery, 0) / mastery.length
        )
      : 0;

  const isNewVisitor =
    snapshot.xp === 0 &&
    snapshot.attempts.length === 0 &&
    overall === 0 &&
    snapshot.streak === 0;

  const status = readinessStatus(overall);

  if (isNewVisitor) {
    return (
      <div className="rounded-lg border border-border bg-card p-6 sm:p-8">
        <p className="font-mono text-xs uppercase tracking-wider text-claude-muted">
          Your readiness · live, on your device
        </p>
        <div className="mt-5 flex flex-wrap items-center gap-4">
          {DOMAIN_INFO.map((d) => (
            <MasteryRing key={d.domain} domain={d.domain} pct={0} />
          ))}
        </div>
        <div className="mt-6 rounded-md border border-claude-orange/40 bg-claude-orange/5 p-4">
          <p className="font-display text-xl">Your dashboard is empty</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Nothing is tracked about you. Take the 12-question diagnostic and
            these rings start reflecting your real mastery — computed and
            stored only in this browser.
          </p>
          <Button asChild className="mt-4">
            <Link href="/learn/diagnostic">
              <Stethoscope className="h-4 w-4" />
              Start with the 12-question diagnostic
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-card p-6 sm:p-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-mono text-xs uppercase tracking-wider text-claude-muted">
            Your readiness · live, on your device
          </p>
          <p className="mt-2 font-display text-5xl text-claude-orange">
            {overall}%
          </p>
        </div>
        <span
          className={`rounded-md border px-3 py-1.5 font-mono text-xs ${status.className}`}
        >
          {status.label}
        </span>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-4">
        {DOMAIN_INFO.map((d) => {
          const m = mastery.find((x) => x.domain === d.domain);
          return (
            <MasteryRing
              key={d.domain}
              domain={d.domain}
              pct={m ? m.mastery : 0}
            />
          );
        })}
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 text-sm">
        <div className="rounded-md border border-border px-3 py-2">
          <div className="flex items-center gap-1.5 font-mono text-xs text-claude-muted">
            <Trophy className="h-3.5 w-3.5" />
            Rank
          </div>
          <div className="mt-1 font-display text-lg">
            {snapshot.rank.name}
          </div>
          <div className="font-mono text-xs text-muted-foreground">
            {snapshot.xp.toLocaleString()} XP
            {snapshot.rank.next !== null && (
              <> · {snapshot.rank.next - snapshot.xp} to next</>
            )}
          </div>
        </div>
        <div className="rounded-md border border-border px-3 py-2">
          <div className="flex items-center gap-1.5 font-mono text-xs text-claude-muted">
            <Flame className="h-3.5 w-3.5" />
            Streak
          </div>
          <div className="mt-1 font-display text-lg">
            {snapshot.streak} day{snapshot.streak === 1 ? "" : "s"}
          </div>
          <div className="font-mono text-xs text-muted-foreground">
            keep it alive
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {snapshot.srsDue > 0 && (
          <Button asChild variant="outline" size="sm">
            <Link href="/learn/drill">
              <Layers className="h-4 w-4" />
              Review due ({snapshot.srsDue})
            </Link>
          </Button>
        )}
        {snapshot.resume.drill && (
          <Button asChild variant="outline" size="sm">
            <Link href="/learn/drill">
              Resume drill
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        )}
        {snapshot.resume.lastGuideSectionId && (
          <Button asChild variant="outline" size="sm">
            <Link href={`/guide#${snapshot.resume.lastGuideSectionId}`}>
              Resume guide
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        )}
      </div>
    </div>
  );
}
