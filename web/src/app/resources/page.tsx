import type { Metadata } from "next";
import Link from "next/link";
import { BookOpen, ExternalLink, FileText, Github, Terminal } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { REPO_URL } from "@/lib/site";
import { DISCLAIMER } from "@/components/layout/Footer";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "Resources — CCAF Guide",
  description:
    "Curated official Anthropic docs, the MCP specification, engineering posts, and this project's own study tooling for the Claude Certified Architect – Foundations exam.",
};

interface ResourceLink {
  label: string;
  href: string;
  note: string;
}

const ANTHROPIC_DOCS: ResourceLink[] = [
  {
    label: "Messages API examples",
    href: "https://docs.anthropic.com/en/api/messages-examples",
    note: "How the stateless API reconstructs conversation history (D4).",
  },
  {
    label: "Tool use overview",
    href: "https://docs.anthropic.com/en/docs/agents-and-tools/tool-use/overview",
    note: "Tool-use concepts and token implications (D2).",
  },
  {
    label: "Define tools",
    href: "https://docs.anthropic.com/en/docs/agents-and-tools/tool-use/implement-tool-use",
    note: "Tool schemas, descriptions, and tool_choice (D2).",
  },
  {
    label: "Structured outputs",
    href: "https://docs.anthropic.com/en/docs/build-with-claude/structured-outputs",
    note: "JSON structured outputs and strict tool use (D4).",
  },
  {
    label: "Batch processing",
    href: "https://docs.anthropic.com/en/docs/build-with-claude/batch-processing",
    note: "Message Batches API and cost trade-offs (D5).",
  },
  {
    label: "Long context prompting tips",
    href: "https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering/long-context-tips",
    note: "Structure for long-document, retrieval-heavy prompts (D5).",
  },
  {
    label: "Citations",
    href: "https://docs.anthropic.com/en/docs/build-with-claude/citations",
    note: "Source-grounded responses and citation constraints (D5).",
  },
  {
    label: "Claude Code CLI reference",
    href: "https://docs.anthropic.com/en/docs/claude-code/cli-reference",
    note: "Sessions, output formats, and permission modes (D3).",
  },
  {
    label: "Claude Code memory",
    href: "https://docs.anthropic.com/en/docs/claude-code/memory",
    note: "CLAUDE.md, /memory, and memory scoping (D3).",
  },
  {
    label: "Claude Code hooks",
    href: "https://docs.anthropic.com/en/docs/claude-code/hooks",
    note: "PreToolUse, hook outputs, and blocking behavior (D3).",
  },
  {
    label: "Claude Agent SDK overview",
    href: "https://docs.anthropic.com/en/docs/claude-code/sdk",
    note: "Programmable agents: tools, hooks, sessions, subagents (D3).",
  },
  {
    label: "Claude Code subagents",
    href: "https://docs.anthropic.com/en/docs/claude-code/sub-agents",
    note: "Subagent contexts and tool limits (D1).",
  },
];

const MCP_DOCS: ResourceLink[] = [
  {
    label: "MCP overview",
    href: "https://modelcontextprotocol.io/docs",
    note: "What MCP is and why it exists (D2).",
  },
  {
    label: "MCP architecture",
    href: "https://modelcontextprotocol.io/docs/learn/architecture",
    note: "Host/client/server model and the unified registry (D2).",
  },
  {
    label: "MCP tools specification",
    href: "https://modelcontextprotocol.io/specification/2024-11-05/server/tools",
    note: "Tool discovery, calling, and error handling (D2).",
  },
  {
    label: "MCP resources specification",
    href: "https://modelcontextprotocol.io/specification/2025-06-18/server/resources",
    note: "Resources as context, URIs, and resource errors (D2).",
  },
  {
    label: "MCP Inspector",
    href: "https://modelcontextprotocol.io/docs/tools",
    note: "Debugging servers and validating tools/resources/prompts (D2).",
  },
];

const ENGINEERING: ResourceLink[] = [
  {
    label: "Building effective agents",
    href: "https://www.anthropic.com/engineering/building-effective-agents",
    note: "Agentic workflow patterns and when to use them (D1).",
  },
  {
    label: "Claude Code best practices",
    href: "https://www.anthropic.com/engineering/claude-code-best-practices",
    note: "Practical development workflow guidance (D3).",
  },
  {
    label: "Anthropic Cookbook",
    href: "https://github.com/anthropics/anthropic-cookbook",
    note: "Implementation examples for tools, extraction, workflows.",
  },
];

const OURS: ResourceLink[] = [
  {
    label: "NotebookLM bundles",
    href: "/notebooklm",
    note: "Per-domain markdown to load into Google NotebookLM as a source.",
  },
  {
    label: "Quick Reference",
    href: "/learn/quick-reference",
    note: "The condensed, exam-day cheat sheet.",
  },
  {
    label: "Glossary",
    href: "/learn/glossary",
    note: "Every term you should be able to define cold.",
  },
  {
    label: "Hands-on exercises",
    href: "/learn/exercises",
    note: "Build the patterns the exam rewards.",
  },
];

function LinkList({ links }: { links: ResourceLink[] }) {
  return (
    <ul className="space-y-3">
      {links.map((l) => {
        const external = l.href.startsWith("http");
        const inner = (
          <>
            <div className="flex items-center gap-1.5">
              <span className="text-sm text-foreground">{l.label}</span>
              {external && (
                <ExternalLink className="h-3 w-3 text-claude-muted" />
              )}
            </div>
            <p className="text-xs text-muted-foreground">{l.note}</p>
          </>
        );
        return (
          <li key={l.href}>
            {external ? (
              <a
                href={l.href}
                target="_blank"
                rel="noopener noreferrer"
                className="block rounded-md border border-border p-3 transition-colors hover:border-claude-orange/50"
              >
                {inner}
              </a>
            ) : (
              <Link
                href={l.href}
                className="block rounded-md border border-border p-3 transition-colors hover:border-claude-orange/50"
              >
                {inner}
              </Link>
            )}
          </li>
        );
      })}
    </ul>
  );
}

export default function ResourcesPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
      <div className="mb-10">
        <h1 className="font-display text-4xl">Resources</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          The primary sources behind this guide. When something here is
          ambiguous, the official documentation is the tie-breaker — read it
          alongside the curriculum, not instead of it.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-display text-xl">
              <BookOpen className="h-5 w-5 text-claude-orange" />
              Official Anthropic documentation
            </CardTitle>
          </CardHeader>
          <CardContent>
            <LinkList links={ANTHROPIC_DOCS} />
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-display text-xl">
                <FileText className="h-5 w-5 text-claude-orange" />
                Model Context Protocol
              </CardTitle>
            </CardHeader>
            <CardContent>
              <LinkList links={MCP_DOCS} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-display text-xl">
                <Github className="h-5 w-5 text-claude-orange" />
                Engineering &amp; examples
              </CardTitle>
            </CardHeader>
            <CardContent>
              <LinkList links={ENGINEERING} />
            </CardContent>
          </Card>
        </div>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-display text-xl">
            <Terminal className="h-5 w-5 text-claude-orange" />
            From this project
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <LinkList links={OURS} />
          </div>
          <div className="flex flex-wrap gap-3 border-t border-border pt-4">
            <Button asChild variant="outline" size="sm">
              <a
                href={REPO_URL}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Github className="h-4 w-4" />
                Repository &amp; CLI quiz
              </a>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/guide">Full study guide</Link>
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            The repository also ships a Python and a TypeScript command-line
            quiz that run fully offline against the same flashcard and
            question banks used here.
          </p>
        </CardContent>
      </Card>

      <p className="mt-12 border-t border-border pt-6 text-xs leading-relaxed text-claude-muted">
        {DISCLAIMER}
      </p>
    </div>
  );
}
