"use client";

import Link from "next/link";
import { Flame, Lock, Trophy } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useProgress } from "@/components/progress/XpProvider";
import { ShareCard } from "@/components/share/ShareCard";

export default function ProfilePage() {
  const { mounted, snapshot } = useProgress();

  if (!mounted) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <div className="h-40 animate-pulse rounded-lg border border-border bg-card" />
      </div>
    );
  }

  const { rank, xp, streak, badges, allBadges } = snapshot;

  const stats = [
    ["Flashcards reviewed", snapshot.flashcardsReviewed],
    ["Cards self-marked correct", snapshot.flashcardsCorrect],
    ["Mock attempts", snapshot.attempts.length],
    ["Best mock", `${Math.round(snapshot.bestPct)}%`],
  ] as const;

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-12 sm:px-6">
      <div>
        <h1 className="font-display text-4xl">Your Profile</h1>
        <p className="mt-2 text-muted-foreground">
          Progress is stored only on this device. Share your card to show off
          your rank — there is no central server.
        </p>
      </div>

      {/* Rank + XP */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-display text-2xl">
            <Trophy className="h-6 w-6 text-claude-orange" />
            {rank.name}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-end justify-between font-mono text-sm">
            <span className="text-2xl text-claude-orange">
              {xp.toLocaleString()} XP
            </span>
            <span className="flex items-center gap-1 text-claude-muted">
              <Flame className="h-4 w-4" />
              {streak}-day streak
            </span>
          </div>
          <Progress value={rank.progressPct} />
          <p className="font-mono text-xs text-claude-muted">
            {rank.next === null
              ? "Max rank reached"
              : `${(rank.next - xp).toLocaleString()} XP to next rank`}
          </p>
        </CardContent>
      </Card>

      {/* Lifetime stats */}
      <Card>
        <CardHeader>
          <CardTitle className="font-display text-2xl">
            Lifetime stats
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {stats.map(([label, value]) => (
              <div key={label}>
                <div className="font-mono text-2xl text-claude-orange">
                  {value}
                </div>
                <div className="text-xs text-muted-foreground">{label}</div>
              </div>
            ))}
            <div>
              <div className="font-mono text-2xl text-claude-orange">
                {snapshot.guidePct}%
              </div>
              <div className="text-xs text-muted-foreground">Guide read</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Badges */}
      <Card>
        <CardHeader>
          <CardTitle className="font-display text-2xl">
            Badges{" "}
            <span className="font-mono text-sm text-claude-muted">
              {badges.length}/{allBadges.length}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2">
            {allBadges.map((b) => (
              <div
                key={b.id}
                className={
                  b.earned
                    ? "rounded-md border border-claude-orange/40 bg-claude-orange/5 p-4"
                    : "rounded-md border border-border bg-card p-4 opacity-50"
                }
              >
                <div className="flex items-center gap-2">
                  {b.earned ? (
                    <Trophy className="h-4 w-4 shrink-0 text-claude-orange" />
                  ) : (
                    <Lock className="h-4 w-4 shrink-0 text-claude-muted" />
                  )}
                  <span className="font-display text-lg">{b.label}</span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {b.description}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Share rank */}
      <Card>
        <CardHeader>
          <CardTitle className="font-display text-2xl">
            Share your rank
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ShareCard
            variant="rank"
            rankName={rank.name}
            xp={xp}
            streak={streak}
            badgeLabels={badges.map((b) => b.label)}
          />
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-3">
        <Button asChild variant="outline">
          <Link href="/leaderboard">Personal leaderboard</Link>
        </Button>
        <Button asChild>
          <Link href="/mock-exam">Take a mock exam</Link>
        </Button>
      </div>
    </div>
  );
}
