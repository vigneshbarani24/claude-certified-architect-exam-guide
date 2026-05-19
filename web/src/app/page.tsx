import Link from "next/link";
import {
  ArrowRight,
  Stethoscope,
  GraduationCap,
  Layers,
  ListChecks,
  Compass,
  Github,
  Wrench,
  ShieldCheck,
  Repeat,
  BookOpenCheck,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ReadinessHero } from "@/components/landing/ReadinessHero";
import { StatStrip } from "@/components/landing/StatStrip";
import { DomainCards } from "@/components/landing/DomainCards";
import { Faq } from "@/components/landing/Faq";
import { REPO_URL, SITE_LEGAL } from "@/lib/site";

// Server component, fully static. All interactive subtrees (ReadinessHero,
// StatStrip, DomainCards) are client + mounted-gated, so the route stays ○.
export const dynamic = "force-static";

const STUDY_LOOP = [
  {
    n: "1",
    title: "Diagnose",
    desc: "A 12-question check surfaces your weakest, highest-weight domains.",
    href: "/learn/diagnostic",
    icon: Stethoscope,
  },
  {
    n: "2",
    title: "Learn",
    desc: "Work the curriculum domain by domain, straight from the guide.",
    href: "/learn",
    icon: GraduationCap,
  },
  {
    n: "3",
    title: "Drill",
    desc: "Spaced-repetition flashcards keep the facts from fading.",
    href: "/learn/drill",
    icon: Layers,
  },
  {
    n: "4",
    title: "Mock",
    desc: "Scenario-based questions under exam-like conditions.",
    href: "/mock-exam",
    icon: ListChecks,
  },
  {
    n: "5",
    title: "Track",
    desc: "Mastery updates on-device and routes your next session.",
    href: "/learn/progress",
    icon: Compass,
  },
];

const PRACTICE_MODES = [
  {
    title: "Diagnostic",
    when: "Start here, or whenever you want a fast, honest read on where you stand across all five domains.",
    href: "/learn/diagnostic",
    icon: Stethoscope,
  },
  {
    title: "Drill",
    when: "Daily — short spaced-repetition sessions that resurface cards right before you would forget them.",
    href: "/learn/drill",
    icon: Layers,
  },
  {
    title: "Mock Exam",
    when: "When a domain feels solid — pick 1, 4, or all 6 scenarios and answer under exam-like pressure.",
    href: "/mock-exam",
    icon: ListChecks,
  },
  {
    title: "Build Exercises",
    when: "When you learn by doing — hands-on tasks that turn concepts into working understanding.",
    href: "/learn/exercises",
    icon: Wrench,
  },
];

const VALUE_PROPS = [
  {
    title: "Original & docs-grounded",
    desc: "Every flashcard, question, and chapter is written for this project and grounded in public Anthropic documentation and the official exam guide — no reproduced exam items.",
    icon: BookOpenCheck,
  },
  {
    title: "Private by construction",
    desc: "There is no backend, database, analytics, or runtime network call. Your mastery, streak, and rank are computed and stored only in your browser.",
    icon: ShieldCheck,
  },
  {
    title: "Spaced repetition + mastery",
    desc: "A Leitner scheduler and weighted per-domain mastery model decide what to resurface and where to send you next, so study time lands where the points are.",
    icon: Repeat,
  },
];

export default function Home() {
  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6">
      {/* HERO — editorial split */}
      <section className="grid gap-10 py-16 lg:grid-cols-2 lg:items-center lg:py-24">
        <div>
          <Badge variant="outline" className="mb-6">
            Claude Certified Architect – Foundations
          </Badge>
          <h1 className="font-display text-5xl leading-tight sm:text-6xl">
            Get Claude{" "}
            <span className="text-claude-orange">Certified</span>
          </h1>
          <p className="mt-6 max-w-xl text-lg text-muted-foreground">
            A complete, free, open-source study system for the CCAF exam —
            guide, diagnostic, mock exam, and spaced-repetition flashcards. The
            only dashboard here is your own real readiness, computed on your
            device.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Button asChild size="lg">
              <Link href="/learn/diagnostic">
                <Stethoscope className="h-4 w-4" />
                Take the diagnostic
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/learn">
                Review the curriculum
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
          <p className="mt-6 font-mono text-xs uppercase tracking-wider text-claude-muted">
            {SITE_LEGAL} · does not issue certifications · CC BY 4.0
          </p>
        </div>
        <ReadinessHero />
      </section>

      {/* HONEST STAT STRIP */}
      <StatStrip />

      {/* THE STUDY LOOP */}
      <section className="py-20">
        <h2 className="mb-3 text-center font-display text-3xl">
          One loop, repeated until ready
        </h2>
        <p className="mx-auto mb-10 max-w-xl text-center text-muted-foreground">
          Diagnose, learn, drill, mock, track — each step feeds the next, and
          your real mastery decides where you go.
        </p>
        <div className="grid gap-5 sm:grid-cols-3 lg:grid-cols-5">
          {STUDY_LOOP.map((s) => (
            <Link key={s.n} href={s.href}>
              <Card className="group h-full transition-all hover:-translate-y-1 hover:border-claude-orange/50 motion-reduce:transition-none motion-reduce:hover:translate-y-0">
                <CardContent className="space-y-3 p-6">
                  <div className="flex items-center justify-between">
                    <s.icon className="h-6 w-6 text-claude-orange" />
                    <span className="flex h-7 w-7 items-center justify-center rounded-full border border-claude-orange/50 font-mono text-xs text-claude-orange">
                      {s.n}
                    </span>
                  </div>
                  <h3 className="font-display text-xl">{s.title}</h3>
                  <p className="text-sm text-muted-foreground">{s.desc}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      {/* FIVE DOMAIN CARDS */}
      <section className="pb-20">
        <div className="mb-8 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="font-display text-3xl">Study by domain</h2>
            <p className="mt-2 text-muted-foreground">
              The exam is weighted — your mastery bar on each card is real and
              updates as you study.
            </p>
          </div>
          <Link
            href="/learn"
            className="text-sm text-claude-orange hover:underline"
          >
            Open the full curriculum →
          </Link>
        </div>
        <DomainCards />
      </section>

      {/* PRACTICE MODES */}
      <section className="pb-20">
        <h2 className="mb-3 text-center font-display text-3xl">
          Four ways to practice
        </h2>
        <p className="mx-auto mb-10 max-w-xl text-center text-muted-foreground">
          Each mode has a job — here is when to reach for it.
        </p>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {PRACTICE_MODES.map((m) => (
            <Link key={m.title} href={m.href}>
              <Card className="group h-full transition-all hover:-translate-y-1 hover:border-claude-orange/50 motion-reduce:transition-none motion-reduce:hover:translate-y-0">
                <CardContent className="space-y-3 p-6">
                  <m.icon className="h-7 w-7 text-claude-orange" />
                  <h3 className="font-display text-xl">{m.title}</h3>
                  <p className="text-sm text-muted-foreground">{m.when}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      {/* WHY THIS WORKS */}
      <section className="pb-20">
        <h2 className="mb-10 text-center font-display text-3xl">
          Why this works
        </h2>
        <div className="grid gap-5 lg:grid-cols-3">
          {VALUE_PROPS.map((v) => (
            <Card key={v.title} className="h-full">
              <CardContent className="space-y-3 p-6">
                <v.icon className="h-7 w-7 text-claude-orange" />
                <h3 className="font-display text-xl">{v.title}</h3>
                <p className="text-sm text-muted-foreground">{v.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="pb-20">
        <h2 className="mb-10 text-center font-display text-3xl">
          Frequently asked
        </h2>
        <div className="mx-auto max-w-3xl">
          <Faq />
        </div>
      </section>

      {/* GITHUB CTA */}
      <section className="pb-24">
        <div className="rounded-lg border border-border bg-gradient-to-br from-claude-orange/10 to-transparent p-10 text-center">
          <h2 className="font-display text-3xl">Open source, forever</h2>
          <p className="mx-auto mt-3 max-w-lg text-muted-foreground">
            Found a mistake or want to add content? Contributions are welcome
            under CC BY 4.0.
          </p>
          <Button asChild size="lg" className="mt-6">
            <a href={REPO_URL} target="_blank" rel="noopener noreferrer">
              <Github className="h-4 w-4" />
              View on GitHub
            </a>
          </Button>
        </div>
      </section>
    </div>
  );
}
