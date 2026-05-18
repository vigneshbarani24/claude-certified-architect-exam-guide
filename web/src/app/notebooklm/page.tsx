import fs from "node:fs";
import path from "node:path";
import { Download, FileText, HelpCircle } from "lucide-react";

import { DOMAIN_META } from "@/data/scenarios";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export const dynamic = "force-static";

interface Bundle {
  key: string;
  title: string;
  weight?: number;
  file: string | null;
  topics: number;
}

function discoverBundles(): Bundle[] {
  const dir = path.join(process.cwd(), "public", "notebooklm");
  let files: string[] = [];
  try {
    files = fs.readdirSync(dir).filter((f) => f.endsWith(".md"));
  } catch {
    files = [];
  }

  const findFile = (...candidates: string[]) =>
    files.find((f) =>
      candidates.some((c) => f.toLowerCase().includes(c))
    ) ?? null;

  const topicsIn = (file: string | null): number => {
    if (!file) return 0;
    try {
      const text = fs.readFileSync(
        path.join(dir, file),
        "utf8"
      );
      const headings = text
        .split("\n")
        .filter((l) => /^#{2,3}\s/.test(l)).length;
      return headings || 1;
    } catch {
      return 0;
    }
  };

  const bundles: Bundle[] = Object.entries(DOMAIN_META).map(([k, v]) => {
    const file = findFile(`domain-${k}`, `domain${k}`, `d${k}`);
    return {
      key: `domain-${k}`,
      title: `Domain ${k}: ${v.name}`,
      weight: v.weight,
      file,
      topics: topicsIn(file),
    };
  });

  const fullFile = findFile("full", "all", "complete", "guide");
  bundles.push({
    key: "full-guide",
    title: "Full Study Guide",
    file: fullFile,
    topics: topicsIn(fullFile),
  });

  return bundles;
}

export default function NotebookLMPage() {
  const bundles = discoverBundles();
  const anyAvailable = bundles.some((b) => b.file);

  return (
    <TooltipProvider delayDuration={150}>
      <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
        <div className="mb-10">
          <h1 className="font-display text-4xl">NotebookLM Bundles</h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            Download a markdown bundle and upload it to Google NotebookLM as a
            source. Then ask it to quiz you, explain concepts, or build a study
            plan.
          </p>
        </div>

        {!anyAvailable && (
          <div className="mb-8 rounded-lg border border-border bg-secondary/40 p-4 text-sm text-muted-foreground">
            Bundle files have not been generated yet. They will appear here
            automatically once <code className="font-mono">notebooklm/*.md</code>{" "}
            exists in the repository at build time.
          </div>
        )}

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {bundles.map((b) => (
            <Card key={b.key} className="flex flex-col">
              <CardHeader className="gap-2">
                <div className="flex items-start justify-between">
                  <FileText className="h-6 w-6 text-claude-orange" />
                  <div className="flex items-center gap-2">
                    {typeof b.weight === "number" && (
                      <Badge variant="outline">{b.weight}%</Badge>
                    )}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          aria-label="How to use"
                          className="text-muted-foreground hover:text-foreground"
                        >
                          <HelpCircle className="h-4 w-4" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>
                        Download this file, then upload it to a NotebookLM
                        notebook as a source to quiz yourself on it.
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </div>
                <CardTitle className="font-display text-lg">
                  {b.title}
                </CardTitle>
              </CardHeader>
              <CardContent className="mt-auto space-y-3">
                <p className="font-mono text-xs text-claude-muted">
                  {b.file
                    ? `${b.topics} topic${b.topics === 1 ? "" : "s"}`
                    : "Not generated yet"}
                </p>
                {b.file ? (
                  <Button asChild className="w-full" size="sm">
                    <a
                      href={`/notebooklm/${b.file}`}
                      download
                    >
                      <Download className="h-4 w-4" />
                      Download
                    </a>
                  </Button>
                ) : (
                  <Button
                    className="w-full"
                    size="sm"
                    variant="secondary"
                    disabled
                  >
                    Unavailable
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-12 rounded-lg border border-border bg-card p-6">
          <h2 className="mb-4 font-display text-2xl">How to use with NotebookLM</h2>
          <ol className="space-y-3 text-sm text-muted-foreground">
            <li className="flex gap-3">
              <span className="font-mono text-claude-orange">1.</span>
              Download the bundle for the domain (or the full guide) you want to
              study.
            </li>
            <li className="flex gap-3">
              <span className="font-mono text-claude-orange">2.</span>
              Go to{" "}
              <a
                href="https://notebooklm.google.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-claude-orange underline underline-offset-2"
              >
                notebooklm.google.com
              </a>{" "}
              and create a new notebook.
            </li>
            <li className="flex gap-3">
              <span className="font-mono text-claude-orange">3.</span>
              Upload the downloaded markdown file as a source.
            </li>
            <li className="flex gap-3">
              <span className="font-mono text-claude-orange">4.</span>
              Ask it to quiz you, explain a concept, or build a study plan from
              the source.
            </li>
          </ol>
        </div>
      </div>
    </TooltipProvider>
  );
}
