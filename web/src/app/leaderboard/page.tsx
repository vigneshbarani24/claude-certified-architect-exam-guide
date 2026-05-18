"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Crown, Users } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useProgress } from "@/components/progress/XpProvider";
import { ShareCard, REPO_URL } from "@/components/share/ShareCard";

export default function LeaderboardPage() {
  const { mounted, snapshot, setDisplayName } = useProgress();
  const [nameInput, setNameInput] = useState("");
  const [challengeCopied, setChallengeCopied] = useState(false);

  const ranked = useMemo(() => {
    return [...snapshot.attempts]
      .map((a, i) => ({
        ...a,
        idx: i,
        pct: a.total > 0 ? Math.round((a.scoreCorrect / a.total) * 100) : 0,
      }))
      .sort((a, b) => b.pct - a.pct);
  }, [snapshot.attempts]);

  if (!mounted) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <div className="h-40 animate-pulse rounded-lg border border-border bg-card" />
      </div>
    );
  }

  const bestPct = ranked.length > 0 ? ranked[0].pct : 0;
  const name = snapshot.displayName || "You";

  const challenge = async () => {
    const text = `My best CCAF mock score is ${bestPct}% (${snapshot.rank.name} rank). Can you beat it? ${REPO_URL}/web/mock-exam`;
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(text);
        setChallengeCopied(true);
        window.setTimeout(() => setChallengeCopied(false), 1800);
      } else if (typeof window !== "undefined") {
        window.open(
          `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`,
          "_blank",
          "noopener,noreferrer"
        );
      }
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-12 sm:px-6">
      <div>
        <h1 className="font-display text-4xl">Personal Leaderboard</h1>
        <p className="mt-2 text-muted-foreground">
          Scores are stored only on your device. Share your card to challenge
          others — there is no central server.
        </p>
      </div>

      {/* Display name */}
      <Card>
        <CardHeader>
          <CardTitle className="font-display text-2xl">
            Display name
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Optional. Stored locally and used to label your board. Not sent
            anywhere.
          </p>
          <div className="flex flex-wrap gap-2">
            <input
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              placeholder={snapshot.displayName || "Your name"}
              maxLength={40}
              className="flex-1 rounded-md border border-border bg-secondary px-3 py-2 text-sm outline-none focus:border-claude-orange"
            />
            <Button
              onClick={() => {
                setDisplayName(nameInput.trim());
                setNameInput("");
              }}
              disabled={nameInput.trim().length === 0}
            >
              Save
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Ranked attempts */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-display text-2xl">
            <Crown className="h-6 w-6 text-claude-orange" />
            {name} · {snapshot.rank.name}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {ranked.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No mock attempts yet.{" "}
              <Link
                href="/mock-exam"
                className="text-claude-orange underline underline-offset-4"
              >
                Take a mock exam
              </Link>{" "}
              to populate your board.
            </p>
          ) : (
            <div className="space-y-2">
              {ranked.map((a, rank) => (
                <div
                  key={a.idx}
                  className={
                    rank === 0
                      ? "flex items-center justify-between rounded-md border border-claude-orange/50 bg-claude-orange/10 px-4 py-3"
                      : "flex items-center justify-between rounded-md border border-border px-4 py-3"
                  }
                >
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-sm text-claude-muted">
                      #{rank + 1}
                    </span>
                    <div>
                      <div className="font-mono text-lg text-claude-orange">
                        {a.pct}%
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {a.scoreCorrect}/{a.total} · {a.scenario}
                      </div>
                    </div>
                  </div>
                  <div className="text-right font-mono text-xs text-claude-muted">
                    {new Date(a.dateISO).toLocaleDateString()}
                    {rank === 0 && (
                      <div className="text-claude-orange">Personal best</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Share + challenge */}
      <Card>
        <CardHeader>
          <CardTitle className="font-display text-2xl">
            Challenge a friend
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button variant="outline" onClick={challenge}>
            <Users className="h-4 w-4" />
            {challengeCopied ? "Challenge copied!" : "Copy challenge link"}
          </Button>
          <ShareCard
            variant="rank"
            rankName={snapshot.rank.name}
            xp={snapshot.xp}
            streak={snapshot.streak}
            badgeLabels={snapshot.badges.map((b) => b.label)}
          />
        </CardContent>
      </Card>
    </div>
  );
}
