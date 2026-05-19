import Link from "next/link";
import {
  BookOpen,
  FileText,
  Github,
  Layers,
  ListChecks,
  ArrowRight,
  Download,
  Trophy,
  Flame,
  Share2,
  Compass,
  GraduationCap,
  Stethoscope,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DomainWeights } from "@/components/home/DomainWeights";
import { DOMAIN_INFO } from "@/lib/learn";
import { REPO_URL } from "@/lib/site";

const FEATURES = [
  {
    title: "Curriculum",
    desc: "A guided path through all five domains, each with its guide chapters and targeted practice.",
    href: "/learn",
    icon: GraduationCap,
  },
  {
    title: "Study Guide",
    desc: "A single-file, domain-organized guide covering every objective with concept callouts and code.",
    href: "/guide",
    icon: BookOpen,
  },
  {
    title: "Mock Exam",
    desc: "Scenario-based practice questions with instant feedback and a per-domain score breakdown.",
    href: "/mock-exam",
    icon: ListChecks,
  },
  {
    title: "Flashcards",
    desc: "Drill the core facts with a 3D flip deck, domain/difficulty filters, and hard-card marking.",
    href: "/flashcards",
    icon: Layers,
  },
  {
    title: "NotebookLM",
    desc: "Download per-domain markdown bundles to load into Google NotebookLM as a study source.",
    href: "/notebooklm",
    icon: FileText,
  },
  {
    title: "Learn Dashboard",
    desc: "Personalized study plan: domain mastery, what to study next, spaced review, and history.",
    href: "/learn/progress",
    icon: Compass,
  },
  {
    title: "Profile & XP",
    desc: "Earn XP, climb rank tiers, build a streak, and unlock badges as you study.",
    href: "/profile",
    icon: Trophy,
  },
  {
    title: "Leaderboard",
    desc: "Your personal mock-score board, kept on-device. Share a card to challenge friends.",
    href: "/leaderboard",
    icon: Share2,
  },
];

const LOOP = [
  {
    n: "1",
    title: "Diagnose",
    desc: "Take the short diagnostic to surface your weakest domains.",
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
    desc: "Watch mastery climb and let it route your next session.",
    href: "/learn/progress",
    icon: Compass,
  },
];

const RANK_TIERS = [
  { name: "Apprentice", min: "0 XP" },
  { name: "Practitioner", min: "300 XP" },
  { name: "Architect", min: "1,000 XP" },
  { name: "Master Architect", min: "2,500 XP" },
];

const BADGE_SHOWCASE = [
  "First Steps",
  "Domain Cleared",
  "Centurion",
  "Perfect Mock",
  "Pass",
  "Streak 7",
  "Streak 30",
];

export default function Home() {
  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6">
      {/* HERO */}
      <section className="py-20 text-center sm:py-28">
        <Badge variant="outline" className="mb-6">
          Claude Certified Architect – Foundations
        </Badge>
        <h1 className="mx-auto max-w-3xl font-display text-5xl leading-tight sm:text-6xl">
          Pass the CCAF Exam.
          <br />
          <span className="text-claude-orange">Free. Open Source.</span>
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-lg text-muted-foreground">
          A community-built study system: guide, mock exam, flashcards, and
          NotebookLM bundles. No accounts, no paywalls.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Button asChild size="lg">
            <Link href="/learn">
              Start the curriculum
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/learn/diagnostic">
              <Stethoscope className="h-4 w-4" />
              Take the diagnostic
            </Link>
          </Button>
        </div>
      </section>

      {/* QUICK STATS */}
      <section className="rounded-lg border border-border bg-card">
        <div className="grid grid-cols-2 divide-x divide-y divide-border sm:grid-cols-4 sm:divide-y-0">
          {[
            ["5", "Domains"],
            ["250", "Flashcards"],
            ["50+", "Practice Questions"],
            ["Free", "Forever"],
          ].map(([big, small]) => (
            <div key={small} className="p-6 text-center">
              <div className="font-display text-3xl text-claude-orange">
                {big}
              </div>
              <div className="mt-1 font-mono text-xs uppercase tracking-wider text-claude-muted">
                {small}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* DOMAIN WEIGHTS */}
      <section className="py-20">
        <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
          <div>
            <h2 className="font-display text-3xl">Know the weighting</h2>
            <p className="mt-3 text-muted-foreground">
              The CCAF exam is weighted across five domains. Spend your study
              time where the points are — Agentic Architecture alone is over a
              quarter of the exam.
            </p>
          </div>
          <DomainWeights />
        </div>
      </section>

      {/* DOMAIN CARDS */}
      <section className="pb-20">
        <div className="mb-8 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <h2 className="font-display text-3xl">Study by domain</h2>
          <Link
            href="/learn"
            className="text-sm text-claude-orange hover:underline"
          >
            Open the full curriculum →
          </Link>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {DOMAIN_INFO.map((d) => (
            <Link key={d.slug} href={`/learn/${d.slug}`}>
              <Card className="h-full transition-colors hover:border-claude-orange/50">
                <CardContent className="space-y-3 p-6">
                  <div className="flex items-start justify-between gap-3">
                    <span className="font-mono text-claude-orange">
                      D{d.domain}
                    </span>
                    <Badge variant="outline">{d.weight}%</Badge>
                  </div>
                  <h3 className="font-display text-lg leading-tight">
                    {d.name}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {d.tagline}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      {/* THE LOOP */}
      <section className="pb-20">
        <h2 className="mb-8 text-center font-display text-3xl">
          A loop that adapts to you
        </h2>
        <div className="grid gap-5 sm:grid-cols-3 lg:grid-cols-5">
          {LOOP.map((s) => (
            <Link key={s.n} href={s.href}>
              <Card className="h-full transition-colors hover:border-claude-orange/50">
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

      {/* FEATURES */}
      <section className="pb-20">
        <h2 className="mb-8 text-center font-display text-3xl">
          Everything you need
        </h2>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f) => (
            <Link key={f.title} href={f.href}>
              <Card className="h-full transition-colors hover:border-claude-orange/50">
                <CardContent className="space-y-3 p-6">
                  <f.icon className="h-7 w-7 text-claude-orange" />
                  <h3 className="font-display text-xl">{f.title}</h3>
                  <p className="text-sm text-muted-foreground">{f.desc}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      {/* NOTEBOOKLM STRIP */}
      <section className="pb-20">
        <Card>
          <CardContent className="space-y-5 p-8">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="font-display text-2xl">NotebookLM bundles</h2>
                <p className="text-sm text-muted-foreground">
                  Per-domain markdown you can drop into Google NotebookLM.
                </p>
              </div>
              <Button asChild variant="outline">
                <Link href="/notebooklm">
                  <Download className="h-4 w-4" />
                  All bundles
                </Link>
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {DOMAIN_INFO.map((d) => (
                <Button
                  key={d.domain}
                  asChild
                  variant="secondary"
                  size="sm"
                >
                  <Link href="/notebooklm">
                    D{d.domain} · {d.name}
                  </Link>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>

      {/* GAMIFIED LOOP */}
      <section className="pb-20">
        <div className="rounded-lg border border-border bg-card p-8 sm:p-10">
          <div className="text-center">
            <Badge variant="outline" className="mb-4">
              New
            </Badge>
            <h2 className="font-display text-3xl">
              Track your progress &amp; share your score
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
              Every card, question, and section you complete earns XP. Climb
              the rank tiers, keep a daily streak alive, unlock badges, and
              export a branded card to challenge friends. All stored on your
              device — no account, no server.
            </p>
          </div>

          <div className="mt-10 grid gap-6 lg:grid-cols-3">
            {/* Ranks */}
            <div>
              <h3 className="mb-3 flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-claude-muted">
                <Trophy className="h-4 w-4 text-claude-orange" />
                Rank tiers
              </h3>
              <div className="space-y-2">
                {RANK_TIERS.map((r) => (
                  <div
                    key={r.name}
                    className="flex items-center justify-between rounded-md border border-border px-3 py-2"
                  >
                    <span className="font-display text-lg">{r.name}</span>
                    <span className="font-mono text-xs text-claude-orange">
                      {r.min}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Badges */}
            <div>
              <h3 className="mb-3 flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-claude-muted">
                <Flame className="h-4 w-4 text-claude-orange" />
                Unlockable badges
              </h3>
              <div className="flex flex-wrap gap-2">
                {BADGE_SHOWCASE.map((b) => (
                  <span
                    key={b}
                    className="rounded-md border border-claude-orange/40 bg-claude-orange/5 px-3 py-1.5 font-mono text-xs text-claude-orange"
                  >
                    {b}
                  </span>
                ))}
              </div>
              <p className="mt-4 text-sm text-muted-foreground">
                Clear each domain, hit a perfect mock, pass the proxy, and
                build streaks of 7 and 30 days.
              </p>
            </div>

            {/* Share card mockup */}
            <div>
              <h3 className="mb-3 flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-claude-muted">
                <Share2 className="h-4 w-4 text-claude-orange" />
                Shareable card
              </h3>
              <div className="rounded-lg border border-border bg-[#0a0a0a] p-5">
                <p className="font-mono text-[10px] uppercase tracking-wider text-claude-orange">
                  CCAF · Claude Certified Architect
                </p>
                <p className="mt-2 font-display text-2xl">My Study Rank</p>
                <p className="font-display text-3xl text-claude-orange">
                  Architect
                </p>
                <p className="mt-2 font-mono text-xs text-foreground">
                  1,240 XP · 12-day streak
                </p>
                <p className="mt-4 font-mono text-[10px] text-claude-muted">
                  github.com/vigneshbarani24
                </p>
              </div>
              <p className="mt-3 text-sm text-muted-foreground">
                Generated client-side with Canvas — download a PNG or share
                straight to X / LinkedIn.
              </p>
            </div>
          </div>

          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button asChild>
              <Link href="/profile">
                View your profile
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/leaderboard">Personal leaderboard</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* GITHUB CTA */}
      <section className="pb-24">
        <div className="rounded-lg border border-border bg-gradient-to-br from-claude-orange/10 to-transparent p-10 text-center">
          <h2 className="font-display text-3xl">Open source, forever</h2>
          <p className="mx-auto mt-3 max-w-lg text-muted-foreground">
            Found a mistake or want to add content? Contributions welcome under
            CC BY 4.0.
          </p>
          <Button asChild size="lg" className="mt-6">
            <a href={REPO_URL} target="_blank" rel="noopener noreferrer">
              <Github className="h-4 w-4" />
              Star on GitHub
            </a>
          </Button>
        </div>
      </section>
    </div>
  );
}
