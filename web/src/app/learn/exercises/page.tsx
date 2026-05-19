import type { Metadata } from "next";
import Link from "next/link";
import { Wrench } from "lucide-react";

import { EXERCISES } from "@/data/exercises";
import { domainInfoBySlug } from "@/lib/learn";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "Hands-on Exercises — CCAF Guide",
  description:
    "Original build exercises that turn the Claude Certified Architect domains into practice: agentic loops, Claude Code config, structured extraction, subagents, batching, and a spaced-repetition agent.",
};

export default function ExercisesPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      <nav className="mb-6 font-mono text-xs text-claude-muted">
        <Link href="/learn" className="hover:text-foreground">
          Curriculum
        </Link>
        <span className="px-2">/</span>
        <span className="text-foreground">Exercises</span>
      </nav>

      <div className="mb-8">
        <h1 className="flex items-center gap-3 font-display text-4xl">
          <Wrench className="h-8 w-8 text-claude-orange" />
          Hands-on exercises
        </h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Reading is not enough — the exam rewards people who have built these
          patterns. Each exercise is a small, self-contained project you can
          do with the Anthropic SDK or Claude Code.
        </p>
      </div>

      <div className="space-y-6">
        {EXERCISES.map((ex, i) => (
          <Card key={ex.id}>
            <CardHeader className="gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-claude-orange">
                  {String(i + 1).padStart(2, "0")}
                </span>
                {ex.primaryDomains.map((d) => (
                  <Badge key={d} variant="outline">
                    D{d}
                  </Badge>
                ))}
              </div>
              <CardTitle className="font-display text-2xl">
                {ex.title}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <p className="text-sm leading-relaxed text-muted-foreground">
                <span className="font-mono text-xs uppercase tracking-wider text-claude-muted">
                  Objective —{" "}
                </span>
                {ex.objective}
              </p>

              <div>
                <p className="mb-2 font-mono text-xs uppercase tracking-wider text-claude-muted">
                  Steps
                </p>
                <ol className="space-y-2 text-sm text-foreground">
                  {ex.steps.map((s, si) => (
                    <li key={si} className="flex gap-3">
                      <span className="font-mono text-claude-orange">
                        {si + 1}.
                      </span>
                      <span className="text-muted-foreground">{s}</span>
                    </li>
                  ))}
                </ol>
              </div>

              <div className="rounded-md border border-claude-orange/40 bg-claude-orange/5 p-4">
                <p className="mb-1 font-mono text-xs uppercase tracking-wider text-claude-orange">
                  What success looks like
                </p>
                <p className="text-sm text-muted-foreground">{ex.success}</p>
              </div>

              <div className="flex flex-wrap items-center gap-2 border-t border-border pt-4">
                <span className="font-mono text-xs uppercase tracking-wider text-claude-muted">
                  Reread
                </span>
                {ex.reviewSlugs.map((slug) => {
                  const info = domainInfoBySlug(slug);
                  return (
                    <Link
                      key={slug}
                      href={`/learn/${slug}`}
                      className="rounded-md border border-border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-claude-orange/50 hover:text-foreground"
                    >
                      {info ? info.name : slug}
                    </Link>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
