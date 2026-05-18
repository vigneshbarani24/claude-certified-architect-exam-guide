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
