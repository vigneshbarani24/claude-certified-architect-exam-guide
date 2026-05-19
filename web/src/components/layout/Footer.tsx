import Link from "next/link";
import { Github } from "lucide-react";

import { REPO_URL } from "@/lib/site";
import { DOMAIN_INFO } from "@/lib/learn";

export const DISCLAIMER =
  "This is an independent community resource. It is not affiliated with, endorsed by, or sponsored by Anthropic. No exam questions are reproduced or paraphrased from the official exam. Content is based on publicly available Anthropic documentation and the official exam guide. Licensed CC BY 4.0.";

interface FooterCol {
  heading: string;
  links: { href: string; label: string; external?: boolean }[];
}

const COLUMNS: FooterCol[] = [
  {
    heading: "Curriculum",
    links: [
      { href: "/learn", label: "Overview" },
      ...DOMAIN_INFO.map((d) => ({
        href: `/learn/${d.slug}`,
        label: `D${d.domain} · ${d.name}`,
      })),
    ],
  },
  {
    heading: "Practice",
    links: [
      { href: "/mock-exam", label: "Mock Exam" },
      { href: "/learn/drill", label: "Drill" },
      { href: "/learn/diagnostic", label: "Diagnostic" },
      { href: "/flashcards", label: "Flashcards" },
      { href: "/learn/progress", label: "Progress" },
    ],
  },
  {
    heading: "Reference",
    links: [
      { href: "/guide", label: "Study Guide" },
      { href: "/learn/quick-reference", label: "Quick Reference" },
      { href: "/learn/glossary", label: "Glossary" },
      { href: "/learn/exercises", label: "Exercises" },
      { href: "/resources", label: "Resources" },
      { href: "/notebooklm", label: "NotebookLM" },
    ],
  },
  {
    heading: "Project",
    links: [
      { href: "/about", label: "About" },
      { href: "/changelog", label: "Changelog" },
      { href: "/privacy", label: "Privacy" },
      { href: REPO_URL, label: "GitHub", external: true },
    ],
  },
];

export function Footer() {
  return (
    <footer className="border-t border-border bg-background">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <div className="flex flex-col gap-10 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-sm">
            <div className="flex items-center gap-2">
              <span className="font-display text-xl">CCAF</span>
              <span className="font-display text-xl text-claude-orange">
                Guide
              </span>
            </div>
            <p className="mt-3 text-sm text-muted-foreground">
              A free, open-source study system for the Claude Certified
              Architect – Foundations exam.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-8 text-sm sm:grid-cols-4">
            {COLUMNS.map((col) => (
              <div key={col.heading} className="flex flex-col gap-2">
                <span className="font-mono text-xs uppercase tracking-wider text-claude-muted">
                  {col.heading}
                </span>
                {col.links.map((l) =>
                  l.external ? (
                    <a
                      key={l.href}
                      href={l.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground"
                    >
                      <Github className="h-3.5 w-3.5" />
                      {l.label}
                    </a>
                  ) : (
                    <Link
                      key={l.href}
                      href={l.href}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      {l.label}
                    </Link>
                  )
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="mt-10 space-y-3 border-t border-border pt-6">
          <p className="text-xs leading-relaxed text-claude-muted">
            {DISCLAIMER}
          </p>
          <p className="text-xs leading-relaxed text-claude-muted">
            Content licensed CC BY 4.0. Study guide adapted, with attribution,
            from the CC BY 4.0 independent study booklet by Daron Yondem; exam
            structure is factual information from the public official exam
            guide.
          </p>
        </div>
      </div>
    </footer>
  );
}
