"use client";

import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  Compass,
  Layers,
  ListChecks,
  Stethoscope,
  Target,
  GraduationCap,
  BookMarked,
  Wrench,
} from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useProgress } from "@/components/progress/XpProvider";
import { getAllFlashcards } from "@/lib/flashcards";
import { DOMAIN_INFO, guideSlugsForDomain } from "@/lib/learn";

// Pure client page (progress snapshot is client-only). No server data keeps
// this route ○ Static.
export const dynamic = "force-static";

const FLASHCARD_COUNTS: Record<number, number> = (() => {
  const counts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const c of getAllFlashcards()) {
    counts[c.domain] = (counts[c.domain] ?? 0) + 1;
  }
  return counts;
})();

const STUDY_LOOP = [
  {
    href: "/learn/diagnostic",
    label: "Diagnostic",
    icon: Stethoscope,
    desc: "Find your gaps",
  },
  {
    href: "/learn",
    label: "Curriculum",
    icon: GraduationCap,
    desc: "Learn each domain",
  },
  {
    href: "/learn/drill",
    label: "Drill",
    icon: Layers,
    desc: "Spaced repetition",
  },
  {
    href: "/mock-exam",
    label: "Mock",
    icon: ListChecks,
    desc: "Scenario practice",
  },
  {
    href: "/learn/progress",
    label: "Progress",
    icon: Compass,
    desc: "Track mastery",
  },
];

const REFERENCE_LINKS = [
  { href: "/learn/quick-reference", label: "Quick Reference", icon: BookOpen },
  { href: "/learn/glossary", label: "Glossary", icon: BookMarked },
  { href: "/learn/exercises", label: "Exercises", icon: Wrench },
  { href: "/resources", label: "Resources", icon: Target },
];

export default function LearnCurriculumPage() {
  const { mounted, snapshot } = useProgress();

  const masteryByDomain: Record<number, number> = {};
  if (mounted) {
    for (const m of snapshot.mastery) masteryByDomain[m.domain] = m.mastery;
  }

  return (
    <div className="mx-auto max-w-5xl space-y-12 px-4 py-12 sm:px-6">
      <div>
        <h1 className="flex items-center gap-3 font-display text-4xl">
          <GraduationCap className="h-8 w-8 text-claude-orange" />
          Curriculum
        </h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          A guided path through all five exam domains. Diagnose your gaps,
          study each domain from the guide, drill with spaced repetition, sit
          mock scenarios, and track mastery — all on-device, no account.
        </p>
      </div>

      {/* STUDY LOOP */}
      <section>
        <h2 className="mb-4 font-mono text-xs uppercase tracking-wider text-claude-muted">
          The study loop
        </h2>
        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {STUDY_LOOP.map((s, i) => (
            <Link key={s.label} href={s.href}>
              <Card className="h-full transition-colors hover:border-claude-orange/50">
                <CardContent className="space-y-2 p-5">
                  <div className="flex items-center justify-between">
                    <s.icon className="h-5 w-5 text-claude-orange" />
                    <span className="font-mono text-xs text-claude-muted">
                      {i + 1}
                    </span>
                  </div>
                  <h3 className="font-display text-lg">{s.label}</h3>
                  <p className="text-xs text-muted-foreground">{s.desc}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      {/* DOMAIN CARDS */}
      <section>
        <h2 className="mb-4 font-display text-2xl">The five domains</h2>
        <div className="grid gap-5 md:grid-cols-2">
          {DOMAIN_INFO.map((d) => {
            const chapters = guideSlugsForDomain(d.domain).length;
            const cards = FLASHCARD_COUNTS[d.domain] ?? 0;
            const mastery = mounted ? masteryByDomain[d.domain] ?? 0 : null;
            return (
              <Link key={d.slug} href={`/learn/${d.slug}`}>
                <Card className="h-full transition-colors hover:border-claude-orange/50">
                  <CardContent className="space-y-3 p-6">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-claude-orange">
                          D{d.domain}
                        </span>
                        <h3 className="font-display text-xl leading-tight">
                          {d.name}
                        </h3>
                      </div>
                      <Badge variant="outline" className="shrink-0">
                        {d.weight}%
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {d.tagline}
                    </p>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-xs text-claude-muted">
                      <span>
                        {chapters} chapter{chapters === 1 ? "" : "s"}
                      </span>
                      <span>{cards} flashcards</span>
                      {mastery !== null && (
                        <span className="text-claude-orange">
                          {mastery}% mastery
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </section>

      {/* REFERENCE */}
      <section>
        <h2 className="mb-4 font-display text-2xl">Reference &amp; practice</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {REFERENCE_LINKS.map((r) => (
            <Link key={r.href} href={r.href}>
              <Card className="h-full transition-colors hover:border-claude-orange/50">
                <CardContent className="flex items-center gap-3 p-5">
                  <r.icon className="h-5 w-5 text-claude-orange" />
                  <span className="text-sm text-foreground">{r.label}</span>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      <section className="rounded-lg border border-border bg-gradient-to-br from-claude-orange/10 to-transparent p-8 text-center">
        <h2 className="font-display text-2xl">Not sure where to start?</h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
          Take the short diagnostic — it samples every domain and points you
          straight at your weakest areas.
        </p>
        <Button asChild className="mt-5">
          <Link href="/learn/diagnostic">
            Start the diagnostic
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </section>
    </div>
  );
}
