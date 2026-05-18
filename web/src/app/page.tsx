import Link from "next/link";
import {
  BookOpen,
  FileText,
  Github,
  Layers,
  ListChecks,
  ArrowRight,
  Download,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DomainWeights } from "@/components/home/DomainWeights";
import { DOMAIN_META } from "@/data/scenarios";

const REPO_URL =
  "https://github.com/vigneshbarani24/claude-certified-architect-exam-guide";

const FEATURES = [
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
];

const STEPS = [
  {
    n: "1",
    title: "Study",
    desc: "Read the guide domain by domain. Mark sections as read to track progress.",
  },
  {
    n: "2",
    title: "Drill",
    desc: "Run flashcards and the mock exam until weak domains turn green.",
  },
  {
    n: "3",
    title: "Pass",
    desc: "Walk into the CCAF exam confident on all five domains.",
  },
];

export default function Home() {
  const domains = Object.entries(DOMAIN_META).map(([k, v]) => ({
    domain: Number(k),
    ...v,
  }));

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
            <Link href="/guide">
              Start studying
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <a href={REPO_URL} target="_blank" rel="noopener noreferrer">
              <Github className="h-4 w-4" />
              Star on GitHub
            </a>
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

      {/* HOW TO USE */}
      <section className="pb-20">
        <h2 className="mb-8 text-center font-display text-3xl">
          How to use this
        </h2>
        <div className="grid gap-5 sm:grid-cols-3">
          {STEPS.map((s) => (
            <Card key={s.n}>
              <CardContent className="space-y-3 p-6">
                <div className="flex h-9 w-9 items-center justify-center rounded-full border border-claude-orange/50 font-mono text-claude-orange">
                  {s.n}
                </div>
                <h3 className="font-display text-xl">{s.title}</h3>
                <p className="text-sm text-muted-foreground">{s.desc}</p>
              </CardContent>
            </Card>
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
              {domains.map((d) => (
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
