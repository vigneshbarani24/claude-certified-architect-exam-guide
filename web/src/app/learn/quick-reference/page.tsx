import type { Metadata } from "next";
import Link from "next/link";

import {
  getGuideChapters,
  renderChaptersHtml,
} from "@/lib/guide-chapters";
import { QUICK_REFERENCE_SLUG } from "@/lib/learn";
import { buildToc } from "@/lib/guide";
import { DISCLAIMER } from "@/components/layout/Footer";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "Quick Reference Cheat Sheet — CCAF Guide",
  description:
    "A condensed, exam-day cheat sheet of the highest-yield Claude Certified Architect facts: agent loop, tool_choice, MCP, structured output, batching, and Claude Code.",
};

export default async function QuickReferencePage() {
  const chapter = getGuideChapters().find(
    (c) => c.slug === QUICK_REFERENCE_SLUG
  );
  const html = chapter ? await renderChaptersHtml([chapter]) : "";

  // Sub-section anchors (### within the cheat sheet) for the on-page list.
  const anchors = chapter
    ? buildToc(chapter.markdown).filter((t) => t.level === 3)
    : [];

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <nav className="mb-6 font-mono text-xs text-claude-muted">
        <Link href="/learn" className="hover:text-foreground">
          Curriculum
        </Link>
        <span className="px-2">/</span>
        <span className="text-foreground">Quick Reference</span>
      </nav>

      <header className="mb-8 border-b border-border pb-6">
        <h1 className="font-display text-4xl">Quick Reference</h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          The highest-yield facts in one place — skim this last before the
          exam. Everything here is condensed from the full study guide.
        </p>
      </header>

      <div className="grid gap-10 lg:grid-cols-[220px_minmax(0,1fr)]">
        <aside className="hidden lg:block">
          <div className="sticky top-24 text-sm">
            <p className="mb-3 font-mono text-xs uppercase tracking-wider text-claude-muted">
              On this page
            </p>
            <ul className="space-y-1">
              {anchors.map((a) => (
                <li key={a.id}>
                  <a
                    href={`#${a.id}`}
                    className="block truncate py-0.5 text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {a.text}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </aside>

        <article
          className="guide-prose min-w-0"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </div>

      <p className="mt-12 border-t border-border pt-6 text-xs leading-relaxed text-claude-muted">
        {DISCLAIMER}
      </p>
    </div>
  );
}
