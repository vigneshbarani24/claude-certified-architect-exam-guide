"use client";

import Link from "next/link";
import { ArrowRight, Target } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DOMAIN_META } from "@/data/scenarios";
import { useProgress } from "@/components/progress/XpProvider";
import { getWeakAreas } from "@/lib/progress";
import { recommendedActionFor } from "@/lib/learn";

export function StudyNext() {
  const { snapshot } = useProgress();
  const weak = getWeakAreas(snapshot.mastery);

  if (weak.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-display text-2xl">
            <Target className="h-5 w-5 text-claude-orange" />
            Study next
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No weak areas detected yet. Start drilling flashcards or take a
            mock exam to build a mastery profile.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button asChild size="sm">
              <Link href="/flashcards">Drill flashcards</Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link href="/mock-exam">Take a mock exam</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-display text-2xl">
          <Target className="h-5 w-5 text-claude-orange" />
          Study next
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {weak.map((w) => {
          const action = recommendedActionFor(w);
          const meta = DOMAIN_META[w.domain];
          return (
            <div
              key={w.domain}
              className="flex flex-col gap-3 rounded-md border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-claude-orange">
                    D{w.domain}
                  </span>
                  <span className="truncate text-sm text-foreground">
                    {meta?.name}
                  </span>
                  <Badge variant="outline" className="shrink-0">
                    {w.mastery}% mastery
                  </Badge>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {action.label}
                </p>
              </div>
              <Button asChild size="sm" className="shrink-0">
                <Link href={action.href}>
                  Go
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
