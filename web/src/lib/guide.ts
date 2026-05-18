import fs from "node:fs";
import path from "node:path";
import GithubSlugger from "github-slugger";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkRehype from "remark-rehype";
import rehypeSlug from "rehype-slug";
import rehypePrettyCode from "rehype-pretty-code";
import rehypeStringify from "rehype-stringify";

import type { TocItem } from "@/components/guide/DomainNav";

const PLACEHOLDER = `# CCAF Study Guide

> The full study guide markdown was not found at build time. This is a
> placeholder so the site still builds. Once \`guide/exam-preparation-guide.md\`
> exists in the repository it will be rendered here automatically.

## Domain 1 — Agentic Architecture & Orchestration

Agents dynamically decide their own steps and tool calls, looping until the
task is complete. The agent loop continues while \`stop_reason\` is
\`"tool_use"\` and ends on \`"end_turn"\`.

## Domain 2 — Tool Design & MCP Integration

Tools are described with a name, description, and JSON Schema. \`tool_choice\`
can be \`"auto"\`, \`"any"\`, a specific tool, or \`"none"\`. MCP servers expose
tools, resources, and prompts.

## Domain 3 — Claude Code Configuration & Workflows

Project memory lives in \`CLAUDE.md\`; custom slash commands live in
\`.claude/commands/\`. Claude Code runs headlessly via \`claude -p\`.

## Domain 4 — Prompt Engineering & Structured Output

Force a tool with a JSON Schema for reliable structured output. Use the system
prompt for durable role and rules.

## Domain 5 — Context Management & Reliability

The Message Batches API processes large batches asynchronously at about 50%
lower cost with results typically within 24 hours. Prompt caching reuses a
stable prefix to cut cost and latency.
`;

export function readGuideMarkdown(): string {
  const candidates = [
    path.join(process.cwd(), "..", "guide", "exam-preparation-guide.md"),
    path.join(process.cwd(), "guide", "exam-preparation-guide.md"),
  ];
  for (const p of candidates) {
    try {
      const text = fs.readFileSync(p, "utf8");
      if (text.trim().length > 0) return text;
    } catch {
      /* try next */
    }
  }
  return PLACEHOLDER;
}

export async function renderGuideHtml(markdown: string): Promise<string> {
  const file = await unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkRehype)
    .use(rehypeSlug)
    .use(rehypePrettyCode, {
      theme: "github-dark",
      keepBackground: false,
    })
    .use(rehypeStringify)
    .process(markdown);
  return String(file);
}

export function buildToc(markdown: string): TocItem[] {
  // Mirror rehype-slug, which also uses github-slugger, so TOC anchors match
  // the IDs applied to rendered headings.
  const slugger = new GithubSlugger();
  const items: TocItem[] = [];
  const lines = markdown.split("\n");
  let inFence = false;

  for (const line of lines) {
    if (/^```/.test(line.trim())) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;
    const m = /^(#{1,3})\s+(.*)$/.exec(line);
    if (!m) continue;
    const level = m[1].length;
    const text = m[2].replace(/[#*`]/g, "").trim();
    const id = slugger.slug(text);
    items.push({ id, text, level });
  }
  return items;
}
