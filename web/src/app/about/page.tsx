import type { Metadata } from "next";
import Link from "next/link";
import { Github } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { REPO_URL } from "@/lib/site";
import { DISCLAIMER } from "@/components/layout/Footer";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "About — CCAF Guide",
  description:
    "What this project is: a free, independent, community-built study system for the Claude Certified Architect – Foundations exam, licensed CC BY 4.0 and not affiliated with Anthropic.",
};

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-12 sm:px-6">
      <div>
        <h1 className="font-display text-4xl">About this project</h1>
        <p className="mt-3 text-muted-foreground">
          A free, open-source study system for the Claude Certified Architect –
          Foundations (CCAF) exam — built and maintained by the community.
        </p>
      </div>

      <Card>
        <CardContent className="space-y-4 p-6 text-sm leading-relaxed text-muted-foreground">
          <h2 className="font-display text-xl text-foreground">
            What it is
          </h2>
          <p>
            A complete, self-contained way to prepare for the CCAF exam: a
            domain-organized study guide, a searchable glossary, hands-on build
            exercises, 250 flashcards with spaced repetition, scenario-based
            mock questions, a diagnostic, and an on-device progress engine. No
            accounts, no paywalls, no upsell.
          </p>

          <h2 className="font-display text-xl text-foreground">
            Independent &amp; community-owned
          </h2>
          <p>
            This is an independent community resource. It is not affiliated
            with, endorsed by, or sponsored by Anthropic. The exam structure it
            references — the five domains, their weights, and task counts — is
            factual information from the publicly available official Anthropic
            exam guide. No exam questions are reproduced or paraphrased.
          </p>

          <h2 className="font-display text-xl text-foreground">
            Attribution
          </h2>
          <p>
            The study guide adapts the community-created, CC BY 4.0
            &ldquo;Independent Study Booklet — Claude Certified Architect –
            Foundations Exam Preparation Guide&rdquo; by Daron Yondem, an
            independent work not affiliated with Anthropic, with attribution to
            the original author. All content on this site is licensed{" "}
            <strong>CC BY 4.0</strong> — reuse and adaptation are permitted
            with attribution.
          </p>

          <h2 className="font-display text-xl text-foreground">
            How it&apos;s built
          </h2>
          <p>
            The site is a static Next.js application. Every page is prerendered
            at build time and served as static files — there is no backend, no
            database, and no runtime network access. All study progress is
            computed and stored entirely in your browser. It is designed to run
            comfortably on a free hosting tier and to work offline once loaded.
          </p>
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-3">
        <Button asChild>
          <a href={REPO_URL} target="_blank" rel="noopener noreferrer">
            <Github className="h-4 w-4" />
            View the repository
          </a>
        </Button>
        <Button asChild variant="outline">
          <Link href="/privacy">How your data is handled</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/changelog">Changelog</Link>
        </Button>
      </div>

      <p className="border-t border-border pt-6 text-xs leading-relaxed text-claude-muted">
        {DISCLAIMER}
      </p>
    </div>
  );
}
