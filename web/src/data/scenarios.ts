export interface Scenario {
  id: string;
  title: string;
  description: string;
  primaryDomains: number[];
}

export const SCENARIOS: Scenario[] = [
  {
    id: "customer-support-resolution-agent",
    title: "Customer Support Resolution Agent",
    description:
      "An agent that triages support tickets, looks up order/account state through tools, and resolves or escalates. Tests the agent loop, tool_choice strategy, when stop_reason is \"tool_use\" vs \"end_turn\", and graceful escalation under uncertainty.",
    primaryDomains: [1, 2, 5],
  },
  {
    id: "code-generation-with-claude-code",
    title: "Code Generation with Claude Code",
    description:
      "Using Claude Code to scaffold, refactor, and test a feature. Tests CLAUDE.md project memory, custom slash commands in .claude/commands/, permission modes, and keeping context lean across a long edit session.",
    primaryDomains: [3, 4],
  },
  {
    id: "multi-agent-research-system",
    title: "Multi-Agent Research System",
    description:
      "An orchestrator-worker pattern where a lead agent plans research and dispatches subagents to gather and synthesize sources. Tests orchestration patterns, context isolation per subagent, and result aggregation.",
    primaryDomains: [1, 5],
  },
  {
    id: "developer-productivity-with-claude",
    title: "Developer Productivity with Claude",
    description:
      "Embedding Claude into day-to-day developer workflows: code review, doc generation, and structured changelog extraction. Tests prompt engineering, system prompts, and structured output via tool/JSON schemas.",
    primaryDomains: [4, 3],
  },
  {
    id: "claude-code-for-continuous-integration",
    title: "Claude Code for Continuous Integration",
    description:
      "Running Claude Code non-interactively in CI to triage failures and propose fixes. Tests headless mode (-p / --output-format), permission and tool allow-listing, and deterministic, side-effect-safe automation.",
    primaryDomains: [3, 5],
  },
  {
    id: "structured-data-extraction",
    title: "Structured Data Extraction",
    description:
      "Extracting reliable structured records from messy documents at scale. Tests tool-based JSON schemas, prefilling, the Message Batches API for cost/throughput, and validation/retry on malformed output.",
    primaryDomains: [4, 2, 5],
  },
];

export const DOMAIN_META: Record<
  number,
  { name: string; weight: number }
> = {
  1: { name: "Agentic Architecture & Orchestration", weight: 27 },
  2: { name: "Tool Design & MCP Integration", weight: 18 },
  3: { name: "Claude Code Configuration & Workflows", weight: 20 },
  4: { name: "Prompt Engineering & Structured Output", weight: 20 },
  5: { name: "Context Management & Reliability", weight: 15 },
};
