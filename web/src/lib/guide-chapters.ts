/**
 * Build-time helpers that slice the single-file study guide markdown into
 * per-chapter sections by their level-2 (`## `) headings, so individual
 * curriculum pages can render just the chapters they need with the exact
 * same markdown pipeline as /guide.
 *
 * No React, no window/localStorage — pure Node fs + the shared remark/rehype
 * renderer. Safe to import from server components only (uses node:fs).
 */

import GithubSlugger from "github-slugger";

import { readGuideMarkdown, renderGuideHtml } from "@/lib/guide";

export interface GuideChapter {
  /** github-slugger slug of the `## ` heading (matches rehype-slug ids). */
  slug: string;
  /** Heading text with markdown control chars stripped. */
  title: string;
  /** Raw markdown of the chapter including its own `## ` heading line. */
  markdown: string;
}

/**
 * Split the guide markdown into level-2 chapters. The slug for each chapter
 * mirrors buildToc()/rehype-slug so anchors stay consistent across the site.
 * Fenced code blocks are tracked so a `## ` inside a fence is not treated as
 * a heading.
 */
export function splitGuideChapters(markdown: string): GuideChapter[] {
  const slugger = new GithubSlugger();
  const lines = markdown.split("\n");
  const chapters: GuideChapter[] = [];

  let inFence = false;
  let current: { slug: string; title: string; lines: string[] } | null = null;

  for (const line of lines) {
    if (/^```/.test(line.trim())) {
      inFence = !inFence;
      if (current) current.lines.push(line);
      continue;
    }

    const m = !inFence ? /^##\s+(.*)$/.exec(line) : null;
    // Only treat `## ` (level 2) as a chapter boundary; `# ` (title) and
    // `### ` (subsections) stay inside the active chapter.
    const isChapterHeading = m !== null && !/^###/.test(line);

    if (isChapterHeading && m) {
      if (current) {
        chapters.push({
          slug: current.slug,
          title: current.title,
          markdown: current.lines.join("\n").trim(),
        });
      }
      const title = m[1].replace(/[#*`]/g, "").trim();
      current = { slug: slugger.slug(title), title, lines: [line] };
      continue;
    }

    // Keep slugger in sync for any heading so duplicate-heading
    // disambiguation matches the full-document render.
    if (!inFence) {
      const hm = /^(#{1,6})\s+(.*)$/.exec(line);
      if (hm && hm[1].length !== 2) {
        slugger.slug(hm[2].replace(/[#*`]/g, "").trim());
      }
    }

    if (current) current.lines.push(line);
  }

  if (current) {
    chapters.push({
      slug: current.slug,
      title: current.title,
      markdown: current.lines.join("\n").trim(),
    });
  }

  return chapters;
}

/** Read + split the guide in one call (build-time convenience). */
export function getGuideChapters(): GuideChapter[] {
  return splitGuideChapters(readGuideMarkdown());
}

/** Render a list of chapters' markdown into a single HTML string. */
export async function renderChaptersHtml(
  chapters: GuideChapter[]
): Promise<string> {
  if (chapters.length === 0) return "";
  const joined = chapters.map((c) => c.markdown).join("\n\n");
  return renderGuideHtml(joined);
}

/** Find a single chapter by its slug (exact match). */
export function findChapter(
  chapters: GuideChapter[],
  slug: string
): GuideChapter | undefined {
  return chapters.find((c) => c.slug === slug);
}
