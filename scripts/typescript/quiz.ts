/**
 * Offline CLI quiz runner for the Claude Certified Architect (CCAF) exam.
 *
 * Feature parity with quiz.py: loads flashcards from
 * ../../flashcards/all-domains.json, interactive reveal + self-grade,
 * per-domain weak-area summary. Fully offline, no API calls.
 *
 * Usage:
 *   npm run quiz -- --domain 1
 *   npm run quiz -- --all
 *   npm run quiz -- --domain 3 --difficulty hard
 *   npm run quiz -- --all --shuffle
 */

import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { Command } from "commander";
import chalk from "chalk";
import inquirer from "inquirer";

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

const VALID_DIFFICULTIES = ["easy", "medium", "hard"] as const;
type Difficulty = (typeof VALID_DIFFICULTIES)[number];

interface Card {
  id: string;
  domain: number;
  domain_name: string;
  front: string;
  back: string;
  difficulty: string;
  tags: string[];
}

interface DomainScore {
  correct: number;
  incorrect: number;
}

interface CliOptions {
  domain?: string;
  all?: boolean;
  difficulty?: string;
  shuffle?: boolean;
}

function domainLabel(domain: number): string {
  return DOMAIN_NAMES[domain] ?? `Domain ${domain}`;
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
    console.error(
      chalk.red(
        `Flashcard data file not found or unreadable:\n  ${path}\n` +
          "Generate it first (see scripts/README.md).",
      ),
    );
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
    console.error(
      chalk.red("The flashcard data file is empty or not a JSON array."),
    );
    process.exit(1);
  }

  const cards = parsed.filter(isCard);
  if (cards.length === 0) {
    console.error(chalk.red("No valid card objects found in data file."));
    process.exit(1);
  }
  return cards;
}

function filterCards(
  cards: Card[],
  domain: number | undefined,
  difficulty: Difficulty | undefined,
): Card[] {
  let selected = cards;
  if (domain !== undefined) {
    selected = selected.filter((c) => c.domain === domain);
  }
  if (difficulty !== undefined) {
    selected = selected.filter(
      (c) => String(c.difficulty).toLowerCase() === difficulty,
    );
  }
  return selected;
}

function shuffleInPlace<T>(items: T[]): void {
  for (let i = items.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = items[i] as T;
    items[i] = items[j] as T;
    items[j] = tmp;
  }
}

async function runQuiz(
  cards: Card[],
  scores: Map<number, DomainScore>,
): Promise<void> {
  const total = cards.length;
  for (let index = 0; index < total; index += 1) {
    const card = cards[index] as Card;
    const difficulty = card.difficulty || "?";

    console.log(
      chalk.cyan(
        `\n┌── Q ${index + 1}/${total} · ${domainLabel(card.domain)} · ` +
          chalk.magenta(difficulty),
      ),
    );
    console.log(chalk.cyan("│"));
    console.log(chalk.bold.white(`│  ${card.front}`));
    console.log(chalk.cyan("└──"));

    await inquirer.prompt([
      {
        type: "input",
        name: "reveal",
        message: chalk.dim("Press Enter to reveal the answer..."),
      },
    ]);

    console.log(chalk.green(`\n  ${chalk.bold("Answer:")} ${card.back}\n`));

    const { correct } = await inquirer.prompt<{ correct: boolean }>([
      {
        type: "confirm",
        name: "correct",
        message: "Did you get it right?",
        default: false,
      },
    ]);

    let score = scores.get(card.domain);
    if (score === undefined) {
      score = { correct: 0, incorrect: 0 };
      scores.set(card.domain, score);
    }
    if (correct) {
      score.correct += 1;
      console.log(chalk.green("Correct\n"));
    } else {
      score.incorrect += 1;
      console.log(chalk.red("Marked incorrect\n"));
    }
  }
}

function accuracy(score: DomainScore): number {
  const total = score.correct + score.incorrect;
  return total === 0 ? 0 : (score.correct / total) * 100;
}

function printSummary(scores: Map<number, DomainScore>): void {
  const answered = [...scores.values()].reduce(
    (sum, s) => sum + s.correct + s.incorrect,
    0,
  );
  if (answered === 0) {
    console.log(chalk.yellow("No questions answered — no summary."));
    return;
  }

  const ordered = [...scores.entries()].sort((a, b) => {
    const accDiff = accuracy(a[1]) - accuracy(b[1]);
    if (accDiff !== 0) {
      return accDiff;
    }
    const aTotal = a[1].correct + a[1].incorrect;
    const bTotal = b[1].correct + b[1].incorrect;
    return bTotal - aTotal;
  });

  console.log(chalk.bold("\nWeak-Area Summary (weakest first)"));
  console.log(
    chalk.dim("Domain".padEnd(46) + "Correct  Incorrect  Accuracy"),
  );
  console.log(chalk.dim("─".repeat(72)));

  let overallCorrect = 0;
  let overallTotal = 0;
  for (const [domain, score] of ordered) {
    overallCorrect += score.correct;
    overallTotal += score.correct + score.incorrect;
    const acc = accuracy(score);
    const accText = `${acc.toFixed(0)}%`;
    const colour =
      acc >= 80 ? chalk.green : acc >= 50 ? chalk.yellow : chalk.red;
    const name = `${domain}. ${domainLabel(domain)}`.slice(0, 44);
    console.log(
      name.padEnd(46) +
        String(score.correct).padEnd(9) +
        String(score.incorrect).padEnd(11) +
        colour(accText),
    );
  }

  const overallAcc =
    overallTotal === 0 ? 0 : (overallCorrect / overallTotal) * 100;
  console.log(chalk.dim("─".repeat(72)));
  console.log(
    chalk.bold(
      "Overall".padEnd(46) +
        String(overallCorrect).padEnd(9) +
        String(overallTotal - overallCorrect).padEnd(11) +
        `${overallAcc.toFixed(0)}%`,
    ),
  );
}

function parseCli(argv: string[]): CliOptions {
  const program = new Command();
  program
    .name("quiz")
    .description("Offline CCAF exam flashcard quiz runner.")
    .option("--domain <n>", "Quiz a single domain (1-5).")
    .option("--all", "Quiz all domains.")
    .option("--difficulty <level>", "Restrict to easy|medium|hard.")
    .option("--shuffle", "Shuffle the question order.")
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

  let difficulty: Difficulty | undefined;
  if (opts.difficulty !== undefined) {
    const lowered = opts.difficulty.toLowerCase();
    if (!VALID_DIFFICULTIES.includes(lowered as Difficulty)) {
      console.error(chalk.red("--difficulty must be easy, medium, or hard."));
      return 1;
    }
    difficulty = lowered as Difficulty;
  }

  const cards = await loadCards(DATA_FILE);
  const selected = filterCards(cards, domain, difficulty);

  if (selected.length === 0) {
    const scope = opts.all ? "all domains" : `domain ${opts.domain}`;
    const extra = difficulty ? ` with difficulty '${difficulty}'` : "";
    console.error(chalk.yellow(`No cards found for ${scope}${extra}.`));
    return 1;
  }

  if (opts.shuffle) {
    shuffleInPlace(selected);
  }

  const scores = new Map<number, DomainScore>();
  console.log(
    chalk.blue(
      `Starting quiz: ${chalk.bold(String(selected.length))} cards. ` +
        "Press Ctrl-C to stop and see your partial summary.",
    ),
  );

  let interrupted = false;
  const onSigint = (): void => {
    interrupted = true;
  };
  process.on("SIGINT", onSigint);

  try {
    await runQuiz(selected, scores);
  } catch (error) {
    // inquirer throws an ExitPromptError when the user presses Ctrl-C.
    if (interrupted || (error instanceof Error && /SIGINT|prompt/i.test(error.message))) {
      console.log(chalk.yellow("\nSession interrupted — partial summary:"));
      printSummary(scores);
      return 0;
    }
    throw error;
  } finally {
    process.off("SIGINT", onSigint);
  }

  printSummary(scores);
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
