/**
 * Export CCAF flashcards from all-domains.json to an Anki-importable file.
 *
 * Produces a tab-separated UTF-8 text file (clean Anki TSV the user can
 * import directly: Front, Back, Domain, Difficulty, Tags). Fully offline.
 *
 * Usage:
 *   npm run export -- --all --out anki-all.txt
 *   npm run export -- --domain 2 --out anki-domain-2.txt
 */

import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { Command } from "commander";
import chalk from "chalk";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DATA_FILE = resolve(__dirname, "..", "..", "flashcards", "all-domains.json");

const DOMAIN_NAMES: Record<number, string> = {
  1: "Agentic Architecture & Orchestration",
  2: "Tool Design & MCP Integration",
  3: "Claude Code Configuration & Workflows",
  4: "Prompt Engineering & Structured Output",
  5: "Context Management & Reliability",
};

interface Card {
  id: string;
  domain: number;
  domain_name: string;
  front: string;
  back: string;
  difficulty: string;
  tags: string[];
}

interface CliOptions {
  domain?: string;
  all?: boolean;
  out?: string;
}

function isCard(value: unknown): value is Card {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const record = value as Record<string, unknown>;
  return (
    typeof record.front === "string" &&
    typeof record.back === "string" &&
    typeof record.domain === "number"
  );
}

async function loadCards(path: string): Promise<Card[]> {
  let raw: string;
  try {
    raw = await readFile(path, "utf-8");
  } catch {
    console.error(chalk.red(`Flashcard data file not found:\n  ${path}`));
    process.exit(1);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(chalk.red(`Data file is not valid JSON: ${message}`));
    process.exit(1);
  }

  if (!Array.isArray(parsed) || parsed.length === 0) {
    console.error(chalk.red("The flashcard data file is empty."));
    process.exit(1);
  }

  const cards = parsed.filter(isCard);
  if (cards.length === 0) {
    console.error(chalk.red("No valid card objects found."));
    process.exit(1);
  }
  return cards;
}

/** Sanitize a field for tab-separated Anki import (no tabs/newlines). */
function tsvField(value: string): string {
  return value.replace(/\t/g, " ").replace(/\r?\n/g, "<br>").trim();
}

function toAnkiTsv(cards: Card[]): string {
  const header = "#separator:tab\n#html:true\n#columns:Front\tBack\tDomain\tDifficulty\tTags\n";
  const rows = cards.map((card) => {
    const domainName = DOMAIN_NAMES[card.domain] ?? `Domain ${card.domain}`;
    const tags = Array.isArray(card.tags) ? card.tags.join(",") : "";
    return [
      tsvField(card.front),
      tsvField(card.back),
      tsvField(`${card.domain} - ${domainName}`),
      tsvField(card.difficulty),
      tsvField(tags),
    ].join("\t");
  });
  return header + rows.join("\n") + "\n";
}

function parseCli(argv: string[]): CliOptions {
  const program = new Command();
  program
    .name("export")
    .description("Export CCAF flashcards to an Anki-importable TSV file.")
    .option("--domain <n>", "Export a single domain (1-5).")
    .option("--all", "Export all domains.")
    .option("--out <path>", "Output file path.")
    .allowExcessArguments(false);

  program.parse(argv);
  return program.opts<CliOptions>();
}

async function main(): Promise<number> {
  const opts = parseCli(process.argv);

  if (!opts.all && opts.domain === undefined) {
    console.error(chalk.red("Provide --domain <1-5> or --all."));
    return 1;
  }
  if (opts.all && opts.domain !== undefined) {
    console.error(chalk.red("Use either --domain or --all, not both."));
    return 1;
  }

  let domain: number | undefined;
  if (!opts.all && opts.domain !== undefined) {
    domain = Number(opts.domain);
    if (!Number.isInteger(domain) || domain < 1 || domain > 5) {
      console.error(chalk.red("--domain must be an integer 1-5."));
      return 1;
    }
  }

  const cards = await loadCards(DATA_FILE);
  const selected =
    domain === undefined ? cards : cards.filter((c) => c.domain === domain);

  if (selected.length === 0) {
    console.error(
      chalk.yellow(
        `No cards found for ${opts.all ? "all domains" : `domain ${opts.domain}`}.`,
      ),
    );
    return 1;
  }

  const outPath = resolve(
    process.cwd(),
    opts.out ?? (domain === undefined ? "ccaf-anki-all.txt" : `ccaf-anki-domain-${domain}.txt`),
  );

  const content = toAnkiTsv(selected);
  await writeFile(outPath, content, "utf-8");
  console.log(
    chalk.green(
      `Exported ${selected.length} card(s) to ${outPath}\n` +
        "Import into Anki: File → Import, separator = Tab, allow HTML.",
    ),
  );
  return 0;
}

main()
  .then((code) => {
    process.exitCode = code;
  })
  .catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(chalk.red(`Unexpected error: ${message}`));
    process.exitCode = 1;
  });
