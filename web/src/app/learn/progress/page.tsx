"use client";

import { Compass } from "lucide-react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useProgress } from "@/components/progress/XpProvider";
import { ShareCard } from "@/components/share/ShareCard";
import { MasteryDashboard } from "@/components/learn/MasteryDashboard";
import { StudyNext } from "@/components/learn/StudyNext";
import { DueReview } from "@/components/learn/DueReview";
import { StudyHistory } from "@/components/learn/StudyHistory";

// Pure client page, no server data — keeps the route ○ Static.
export const dynamic = "force-static";

export default function LearnProgressPage() {
  const { mounted, snapshot } = useProgress();

  if (!mounted) {
    return (
      <div className="mx-auto max-w-4xl space-y-4 px-4 py-12 sm:px-6">
        <div className="h-24 animate-pulse rounded-lg border border-border bg-card" />
        <div className="h-64 animate-pulse rounded-lg border border-border bg-card" />
      </div>
    );
  }

  const { rank, xp, streak, badges } = snapshot;

  return (
    <div className="mx-auto max-w-4xl space-y-8 px-4 py-12 sm:px-6">
      <div>
        <h1 className="flex items-center gap-3 font-display text-4xl">
          <Compass className="h-8 w-8 text-claude-orange" />
          Progress
        </h1>
        <p className="mt-2 text-muted-foreground">
          Your personalized study plan: domain mastery, what to study next,
          spaced review, and history. All on-device, no account.
        </p>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="flex h-auto flex-wrap">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="spaced">Spaced Review</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <StudyNext />
          <MasteryDashboard />
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
        </TabsContent>

        <TabsContent value="spaced" className="space-y-6">
          <DueReview />
        </TabsContent>

        <TabsContent value="history" className="space-y-6">
          <StudyHistory />
        </TabsContent>
      </Tabs>
    </div>
  );
}
