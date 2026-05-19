import type { Metadata } from "next";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DISCLAIMER } from "@/components/layout/Footer";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "Changelog — CCAF Guide",
  description:
    "Build milestones for the CCAF study system: study guide and CLI, flashcards and NotebookLM bundles, the gamified progress loop, and the full curriculum information architecture.",
};

interface Release {
  date: string;
  title: string;
  items: string[];
}

const RELEASES: Release[] = [
  {
    date: "2026-05-19",
    title: "Full curriculum information architecture",
    items: [
      "Added a Curriculum hub at /learn with per-domain pages that render the mapped guide chapters in place.",
      "Added a focused spaced drill, a cross-domain diagnostic, a Quick Reference page, an original glossary, and hands-on build exercises.",
      "Added a Resources hub, plus About, Privacy, and Changelog pages, a sitemap, and robots rules.",
      "Relocated the personalized dashboard to /learn/progress and reworked navigation and the landing page around the Diagnose → Learn → Drill → Mock → Track loop.",
    ],
  },
  {
    date: "2026-04-02",
    title: "Personalized learn dashboard",
    items: [
      "Introduced domain mastery, a what-to-study-next planner, and a study-history heatmap.",
      "Added Leitner spaced repetition with a due queue and resume state.",
    ],
  },
  {
    date: "2026-03-05",
    title: "Gamified progress loop",
    items: [
      "Added the on-device XP, rank, streak, and badge engine.",
      "Added a personal leaderboard and locally generated, shareable result cards.",
    ],
  },
  {
    date: "2026-02-10",
    title: "Web app, flashcards, and NotebookLM bundles",
    items: [
      "Launched the static Next.js site with the study guide, mock exam, and flashcard deck.",
      "Shipped 250 flashcards across the five domains and per-domain NotebookLM markdown bundles.",
    ],
  },
  {
    date: "2026-01-15",
    title: "Study guide, CLI, and CI",
    items: [
      "Published the single-file, domain-organized study guide.",
      "Added the Python and TypeScript command-line quizzes and continuous-integration data validation.",
    ],
  },
];

export default function ChangelogPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-12 sm:px-6">
      <div>
        <h1 className="font-display text-4xl">Changelog</h1>
        <p className="mt-3 text-muted-foreground">
          The milestones that built this study system, most recent first.
        </p>
      </div>

      <div className="space-y-6">
        {RELEASES.map((r) => (
          <Card key={r.date}>
            <CardContent className="space-y-3 p-6">
              <div className="flex flex-wrap items-center gap-3">
                <Badge variant="outline">{r.date}</Badge>
                <h2 className="font-display text-xl text-foreground">
                  {r.title}
                </h2>
              </div>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {r.items.map((it, i) => (
                  <li key={i} className="flex gap-3">
                    <span className="font-mono text-claude-orange">·</span>
                    {it}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>

      <p className="border-t border-border pt-6 text-xs leading-relaxed text-claude-muted">
        {DISCLAIMER}
      </p>
    </div>
  );
}
