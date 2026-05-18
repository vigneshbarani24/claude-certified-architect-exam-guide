import Link from "next/link";
import { Github } from "lucide-react";

const REPO_URL =
  "https://github.com/vigneshbarani24/claude-certified-architect-exam-guide";

export const DISCLAIMER =
  "This is an independent community resource. It is not affiliated with, endorsed by, or sponsored by Anthropic. No exam questions are reproduced or paraphrased from the official exam. Content is based on publicly available Anthropic documentation and the official exam guide. Licensed CC BY 4.0.";

export function Footer() {
  return (
    <footer className="border-t border-border bg-background">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
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

          <div className="grid grid-cols-2 gap-8 text-sm sm:grid-cols-3">
            <div className="flex flex-col gap-2">
              <span className="font-mono text-xs uppercase tracking-wider text-claude-muted">
                Study
              </span>
              <Link
                href="/guide"
                className="text-muted-foreground hover:text-foreground"
              >
                Study Guide
              </Link>
              <Link
                href="/flashcards"
                className="text-muted-foreground hover:text-foreground"
              >
                Flashcards
              </Link>
            </div>
            <div className="flex flex-col gap-2">
              <span className="font-mono text-xs uppercase tracking-wider text-claude-muted">
                Practice
              </span>
              <Link
                href="/mock-exam"
                className="text-muted-foreground hover:text-foreground"
              >
                Mock Exam
              </Link>
              <Link
                href="/notebooklm"
                className="text-muted-foreground hover:text-foreground"
              >
                NotebookLM
              </Link>
            </div>
            <div className="flex flex-col gap-2">
              <span className="font-mono text-xs uppercase tracking-wider text-claude-muted">
                Project
              </span>
              <a
                href={REPO_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground"
              >
                <Github className="h-3.5 w-3.5" />
                GitHub
              </a>
            </div>
          </div>
        </div>

        <div className="mt-10 border-t border-border pt-6">
          <p className="text-xs leading-relaxed text-claude-muted">
            {DISCLAIMER}
          </p>
        </div>
      </div>
    </footer>
  );
}
