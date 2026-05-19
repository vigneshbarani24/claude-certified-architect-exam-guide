import type { Metadata } from "next";
import Link from "next/link";
import { BookMarked } from "lucide-react";

import { GLOSSARY } from "@/data/glossary";
import { GlossaryBrowser } from "@/components/learn/GlossaryBrowser";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "Glossary — CCAF Guide",
  description:
    "An original, searchable glossary of the Claude Certified Architect terms you should be able to define cold: agent loop, tool_choice, MCP, batching, hooks, and more.",
};

export default function GlossaryPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      <nav className="mb-6 font-mono text-xs text-claude-muted">
        <Link href="/learn" className="hover:text-foreground">
          Curriculum
        </Link>
        <span className="px-2">/</span>
        <span className="text-foreground">Glossary</span>
      </nav>

      <div className="mb-8">
        <h1 className="flex items-center gap-3 font-display text-4xl">
          <BookMarked className="h-8 w-8 text-claude-orange" />
          Glossary
        </h1>
        <p className="mt-2 text-muted-foreground">
          {GLOSSARY.length} terms you should be able to define cold for the
          exam. Original definitions, condensed from the study guide.
        </p>
      </div>

      <GlossaryBrowser />
    </div>
  );
}
