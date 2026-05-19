/**
 * Pure learning-domain helpers. No React, no window/localStorage.
 *
 * The guide chapter → exam-domain map below uses the ACTUAL rendered heading
 * slugs produced by buildToc()/rehype-slug (github-slugger) on
 * guide/exam-preparation-guide.md, verified at implementation time. Chapter 13
 * (Quick Reference Cheat Sheet) is intentionally excluded — it spans all
 * domains and is not a study target.
 */

import { SCENARIOS, DOMAIN_META } from "@/data/scenarios";
import {
  registerGuideDomainMap,
  type WeakArea,
} from "@/lib/progress";

/**
 * Verified slug → domain. Slugs confirmed against the live TOC builder:
 *  1  api-fundamentals-and-output-control            → 4
 *  2  designing-tool-interfaces-for-llm-agents        → 2
 *  3  error-handling-in-agent-tools                   → 2
 *  4  structured-data-extraction-and-validation       → 4
 *  5  conversation-context-management                 → 5
 *  6  system-prompt-engineering-and-conversational-…  → 4
 *  7  model-context-protocol-mcp                      → 2
 *  8  agentic-patterns-and-task-decomposition         → 1
 *  9  customer-service-and-production-workflow-design → 1
 * 10  claude-code-and-claude-agent-sdk-workflows      → 3
 * 11  iterative-refinement-testing-and-evaluation     → 5
 * 12  batch-processing-cost-and-latency               → 5
 */
export const GUIDE_CHAPTER_DOMAIN: Record<string, number> = {
  "1-api-fundamentals-and-output-control": 4,
  "2-designing-tool-interfaces-for-llm-agents": 2,
  "3-error-handling-in-agent-tools": 2,
  "4-structured-data-extraction-and-validation": 4,
  "5-conversation-context-management": 5,
  "6-system-prompt-engineering-and-conversational-behavior": 4,
  "7-model-context-protocol-mcp": 2,
  "8-agentic-patterns-and-task-decomposition": 1,
  "9-customer-service-and-production-workflow-design": 1,
  "10-claude-code-and-claude-agent-sdk-workflows": 3,
  "11-iterative-refinement-testing-and-evaluation": 5,
  "12-batch-processing-cost-and-latency": 5,
};

// Register the map so getSnapshot()'s mastery can include guidePct without a
// circular import. Safe & idempotent (pure assignment in progress.ts).
registerGuideDomainMap(GUIDE_CHAPTER_DOMAIN);

/** Guide chapter slugs that belong to a given exam domain. */
export function guideSlugsForDomain(domain: number): string[] {
  return Object.entries(GUIDE_CHAPTER_DOMAIN)
    .filter(([, d]) => d === domain)
    .map(([slug]) => slug);
}

/** Re-export domain exam weights from the canonical DOMAIN_META source. */
export const DOMAIN_WEIGHTS: Record<number, number> = Object.fromEntries(
  Object.entries(DOMAIN_META).map(([k, v]) => [Number(k), v.weight])
);

/**
 * Canonical per-domain metadata for the curriculum IA. Slugs are the
 * stable URL segments used by /learn/[domain], sitemap, and nav. The
 * one-line and overview prose is ORIGINAL, written for this project and
 * grounded in the mapped guide chapters — not copied from any third party.
 */
export interface DomainInfo {
  domain: number;
  slug: string;
  name: string;
  weight: number;
  /** One-line card description. */
  tagline: string;
  /** 2-3 sentence original overview for the domain landing page. */
  overview: string;
}

export const DOMAIN_INFO: DomainInfo[] = [
  {
    domain: 1,
    slug: "1-agentic-architecture",
    name: "Agentic Architecture & Orchestration",
    weight: 27,
    tagline:
      "The agent loop, tool-use stop reasons, and orchestrator-worker patterns.",
    overview:
      "This is the heaviest domain on the exam. You need to reason fluently about the agent loop — how a turn alternates between assistant tool_use and user tool_result blocks, and why the loop continues until stop_reason is \"end_turn\". It also covers task decomposition, when to choose a single agent versus an orchestrator dispatching isolated subagents, and how to design production workflows that escalate gracefully under uncertainty.",
  },
  {
    domain: 2,
    slug: "2-tool-design-mcp",
    name: "Tool Design & MCP Integration",
    weight: 18,
    tagline:
      "Tool schemas, tool_choice, robust error contracts, and the MCP surface.",
    overview:
      "Tools are the agent's hands, and their descriptions and JSON Schemas are prompt surface the model reads on every call. This domain covers writing tool interfaces an LLM can use reliably, the tool_choice strategies (auto / any / specific / none), and the difference between an in-band tool error (isError) and a transport-level JSON-RPC protocol error. It also covers the Model Context Protocol — how servers expose tools, resources, and prompts through one registry.",
  },
  {
    domain: 3,
    slug: "3-claude-code-config",
    name: "Claude Code Configuration & Workflows",
    weight: 20,
    tagline:
      "CLAUDE.md memory, slash commands, hooks, permissions, and headless runs.",
    overview:
      "Claude Code is configured through layered context and automation. This domain covers the CLAUDE.md memory hierarchy and @imports, custom slash commands, lifecycle hooks (PreToolUse / PostToolUse / UserPromptSubmit / SessionStart), permission modes and tool allow-listing, and running the CLI non-interactively for CI with deterministic, side-effect-safe behavior.",
  },
  {
    domain: 4,
    slug: "4-prompt-engineering",
    name: "Prompt Engineering & Structured Output",
    weight: 20,
    tagline:
      "System prompts, the stateless Messages API, and reliable JSON output.",
    overview:
      "Reliable output starts with a well-structured prompt. This domain covers the stateless Messages API and how conversation history is reconstructed each call, using the system parameter for durable role and rules, and forcing schema-valid structured output via tool use, strict tool use, and prefilling — plus validating and retrying on malformed output.",
  },
  {
    domain: 5,
    slug: "5-context-management",
    name: "Context Management & Reliability",
    weight: 15,
    tagline:
      "Context window strategy, batching economics, and evaluation loops.",
    overview:
      "Long-running and high-volume work needs deliberate context and reliability strategy. This domain covers managing a finite context window with sliding windows, progressive summarization, and structured state; using the Message Batches API for asynchronous, lower-cost throughput; and building iterative refinement, testing, and evaluation loops so quality is measured rather than assumed.",
  },
];

const DOMAIN_INFO_BY_SLUG: Record<string, DomainInfo> = Object.fromEntries(
  DOMAIN_INFO.map((d) => [d.slug, d])
);

const DOMAIN_INFO_BY_NUM: Record<number, DomainInfo> = Object.fromEntries(
  DOMAIN_INFO.map((d) => [d.domain, d])
);

/** All curriculum domain slugs, in exam order. */
export const DOMAIN_SLUGS: string[] = DOMAIN_INFO.map((d) => d.slug);

export function domainInfoBySlug(slug: string): DomainInfo | undefined {
  return DOMAIN_INFO_BY_SLUG[slug];
}

export function domainInfoByNumber(domain: number): DomainInfo | undefined {
  return DOMAIN_INFO_BY_NUM[domain];
}

/** Slug of the guide's Quick Reference Cheat Sheet chapter (chapter 13). */
export const QUICK_REFERENCE_SLUG = "13-quick-reference-cheat-sheet";

export interface RecommendedAction {
  label: string;
  href: string;
}

/**
 * Build a deep-link recommendation for a weak area. The link target is chosen
 * from the weakest sub-score reason:
 *  - guide    → /guide#<firstChapterSlugForDomain>
 *  - mock     → /mock-exam?scenario=<scenarioId covering the domain>
 *  - reviewed → /flashcards?domain=N
 *  - correct  → /flashcards?domain=N&due=1
 */
export function recommendedActionFor(weak: WeakArea): RecommendedAction {
  const d = weak.domain;
  if (weak.reason === "guide") {
    const slug = guideSlugsForDomain(d)[0];
    return {
      label: `Read the D${d} guide chapter`,
      href: slug ? `/guide#${slug}` : "/guide",
    };
  }
  if (weak.reason === "mock") {
    const scenario = SCENARIOS.find((s) => s.primaryDomains.includes(d));
    return {
      label: `Practice a D${d} mock scenario`,
      href: scenario
        ? `/mock-exam?scenario=${encodeURIComponent(scenario.id)}`
        : "/mock-exam",
    };
  }
  if (weak.reason === "correct") {
    return {
      label: `Re-drill due D${d} cards`,
      href: `/flashcards?domain=${d}&due=1`,
    };
  }
  return {
    label: `Drill D${d} flashcards`,
    href: `/flashcards?domain=${d}`,
  };
}
