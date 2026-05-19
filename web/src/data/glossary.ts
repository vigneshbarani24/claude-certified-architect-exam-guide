/**
 * Original glossary for the CCAF study system. Every definition is written
 * for this project, grounded in guide/exam-preparation-guide.md — not copied
 * from Anthropic docs or any third-party study site. `domain` maps a term to
 * the exam domain where it is most heavily tested (omitted when cross-cutting).
 */

export interface GlossaryEntry {
  term: string;
  domain?: number;
  definition: string;
}

export const GLOSSARY: GlossaryEntry[] = [
  {
    term: "Agent loop",
    domain: 1,
    definition:
      "The repeating cycle where the model returns a tool_use request, the client executes the tool and returns a tool_result, and the API is called again — continuing until stop_reason is \"end_turn\".",
  },
  {
    term: "stop_reason",
    domain: 1,
    definition:
      "The field on a Messages API response that says why generation stopped. \"tool_use\" means the client must run the requested tools and continue the loop; \"end_turn\" means the turn is complete.",
  },
  {
    term: "tool_use block",
    domain: 2,
    definition:
      "An assistant content block in which Claude requests a tool by name with input arguments and a unique id the client must echo back.",
  },
  {
    term: "tool_result block",
    domain: 2,
    definition:
      "A user-role content block returning a tool's output to Claude. Its tool_use_id must match the originating tool_use block's id.",
  },
  {
    term: "tool_choice: auto",
    domain: 4,
    definition:
      "Lets Claude decide whether to call a tool or answer directly. The default and right choice for open-ended agent turns.",
  },
  {
    term: "tool_choice: any",
    domain: 4,
    definition:
      "Forces Claude to call exactly one of the provided tools (its choice of which), but never a plain text answer.",
  },
  {
    term: "tool_choice: tool",
    domain: 4,
    definition:
      "Forces Claude to call one specific named tool — the standard lever for reliable structured output via a single schema-bound tool.",
  },
  {
    term: "tool_choice: none",
    domain: 4,
    definition:
      "Prevents any tool call, forcing a text-only response even when tools are defined.",
  },
  {
    term: "Stateless Messages API",
    domain: 4,
    definition:
      "The Messages API keeps no server-side memory of a conversation. Every call must resend the full message history the model should condition on.",
  },
  {
    term: "system parameter",
    domain: 4,
    definition:
      "A top-level request field carrying durable role, rules, and constraints. It is not a message and is the right place for behavior that must persist across the whole conversation.",
  },
  {
    term: "Prefilling",
    domain: 4,
    definition:
      "Seeding the start of the assistant's response (e.g. an opening brace) to constrain format and steer Claude toward valid structured output.",
  },
  {
    term: "Structured outputs",
    domain: 4,
    definition:
      "Producing machine-parseable results (typically JSON) whose shape is governed by a schema rather than parsed loosely from prose.",
  },
  {
    term: "Strict tool use",
    domain: 4,
    definition:
      "A mode that guarantees the model's tool input conforms to the declared JSON Schema, removing a class of malformed-argument failures.",
  },
  {
    term: "Validation-retry loop",
    domain: 4,
    definition:
      "A reliability pattern: validate model output against a schema/rules and, on failure, feed the error back and retry rather than trusting the first response.",
  },
  {
    term: "JSON Schema (tool input)",
    domain: 2,
    definition:
      "The contract describing a tool's accepted arguments. The model reads it on every call, so clear types, required fields, and descriptions directly affect tool-call reliability.",
  },
  {
    term: "isError (tool result)",
    domain: 2,
    definition:
      "An in-band signal that a tool ran but failed logically (e.g. record not found). Claude sees it and can adapt — distinct from a transport failure.",
  },
  {
    term: "JSON-RPC protocol error",
    domain: 2,
    definition:
      "A transport-level MCP failure (malformed request, unknown method) returned through the protocol layer, not as a tool result the model reasons over.",
  },
  {
    term: "Model Context Protocol (MCP)",
    domain: 2,
    definition:
      "An open protocol that lets a host connect to servers exposing tools, resources, and prompts through one unified registry.",
  },
  {
    term: "MCP tools",
    domain: 2,
    definition:
      "Model-invocable actions an MCP server exposes, discovered and called by the client like any other tool.",
  },
  {
    term: "MCP resources",
    domain: 2,
    definition:
      "Readable context an MCP server exposes by URI (files, records, docs) for the model to reference rather than invoke as actions.",
  },
  {
    term: "MCP prompts",
    domain: 2,
    definition:
      "Reusable, parameterized prompt templates an MCP server publishes so clients can trigger consistent workflows.",
  },
  {
    term: "readOnlyHint",
    domain: 2,
    definition:
      "A tool annotation declaring the tool only reads state and causes no side effects, helping hosts decide when confirmation is unnecessary.",
  },
  {
    term: "destructiveHint",
    domain: 2,
    definition:
      "A tool annotation flagging that the tool may perform irreversible or damaging changes, signalling a confirmation gate.",
  },
  {
    term: "idempotentHint",
    domain: 2,
    definition:
      "A tool annotation indicating repeated calls with the same arguments have the same effect as one call — safe to retry.",
  },
  {
    term: "openWorldHint",
    domain: 2,
    definition:
      "A tool annotation indicating the tool interacts with an unbounded external system (e.g. the web) rather than a closed, known dataset.",
  },
  {
    term: "Progressive availability",
    domain: 2,
    definition:
      "Exposing only the tools relevant to the current state or phase, reducing prompt surface and the chance of the model picking the wrong tool.",
  },
  {
    term: "Preview-then-execute",
    domain: 1,
    definition:
      "A safety pattern where a risky action first returns a preview plus a confirmation token; the action only commits when that token is passed back.",
  },
  {
    term: "Sliding window",
    domain: 5,
    definition:
      "A context strategy that keeps only the most recent turns within the window, dropping the oldest, to bound token growth in long conversations.",
  },
  {
    term: "Progressive summarization",
    domain: 5,
    definition:
      "Periodically compressing older conversation into a running summary so essential state survives while raw history is discarded.",
  },
  {
    term: "Structured state",
    domain: 5,
    definition:
      "Carrying durable task state as compact structured data (not free-form chat) so it survives summarization and stays cheap to resend.",
  },
  {
    term: "Context window",
    domain: 5,
    definition:
      "The finite token budget for system prompt, history, tools, and the response combined. Every long-running design must plan for its limit.",
  },
  {
    term: "Prompt dilution",
    domain: 5,
    definition:
      "Loss of instruction-following when the prompt is padded with low-signal content, weakening the model's focus on what matters.",
  },
  {
    term: "Prompt caching",
    domain: 5,
    definition:
      "Reusing a stable request prefix across calls so the cached portion is cheaper and faster than reprocessing it every time.",
  },
  {
    term: "Message Batches API",
    domain: 5,
    definition:
      "An asynchronous API for submitting many requests at once at lower cost, with results returned over a longer window instead of synchronously.",
  },
  {
    term: "custom_id (batch)",
    domain: 5,
    definition:
      "A caller-supplied identifier on each batch request used to map asynchronous results back to their original input, since order is not guaranteed.",
  },
  {
    term: "Partition-then-parallel",
    domain: 5,
    definition:
      "Splitting a large workload into independent partitions processed in parallel (often via batching) to raise throughput within cost limits.",
  },
  {
    term: "Claim-source mapping",
    domain: 5,
    definition:
      "Associating each generated claim with the source that supports it, enabling grounded, verifiable output in research-style workflows.",
  },
  {
    term: "Orchestrator-worker pattern",
    domain: 1,
    definition:
      "A multi-agent design where a lead agent plans and delegates subtasks to focused worker subagents, then synthesizes their results.",
  },
  {
    term: "Subagent context isolation",
    domain: 1,
    definition:
      "Giving each subagent its own scoped context so its work does not pollute the orchestrator's or peers' context windows.",
  },
  {
    term: "Task decomposition",
    domain: 1,
    definition:
      "Breaking a goal into ordered, individually solvable steps so an agent can make progress and recover predictably.",
  },
  {
    term: "Graceful escalation",
    domain: 1,
    definition:
      "Designing an agent to hand off to a human or safer fallback when confidence is low instead of guessing on high-stakes actions.",
  },
  {
    term: "Single agent vs. workflow",
    domain: 1,
    definition:
      "The design choice between letting one agent decide its own steps versus a fixed, predefined workflow — autonomy traded against predictability.",
  },
  {
    term: "Leitner spaced repetition",
    domain: 5,
    definition:
      "A review schedule using boxes with increasing intervals: a correct answer promotes a card to a longer interval; a miss demotes it for sooner review.",
  },
  {
    term: "Plan mode",
    domain: 3,
    definition:
      "A Claude Code mode that produces a proposed plan for review before any edits or commands run, separating intent from execution.",
  },
  {
    term: "CLAUDE.md",
    domain: 3,
    definition:
      "Project (and user) memory Claude Code loads as durable context. It establishes conventions, constraints, and commands for the repository.",
  },
  {
    term: "CLAUDE.md hierarchy",
    domain: 3,
    definition:
      "The layering of memory files (enterprise, user, project, subdirectory) where more specific files refine or override broader ones.",
  },
  {
    term: "@imports (memory)",
    domain: 3,
    definition:
      "References inside a memory file that pull in other files, letting large guidance be composed from smaller, focused pieces.",
  },
  {
    term: "Custom slash command",
    domain: 3,
    definition:
      "A reusable prompt saved as a file under the commands directory, invoked by name to run a repeatable Claude Code workflow.",
  },
  {
    term: "PreToolUse hook",
    domain: 3,
    definition:
      "A lifecycle hook that runs before a tool executes and can inspect, allow, or block the call — the main programmatic guardrail.",
  },
  {
    term: "PostToolUse hook",
    domain: 3,
    definition:
      "A lifecycle hook that runs after a tool completes, useful for formatting, logging, or validating the result.",
  },
  {
    term: "UserPromptSubmit hook",
    domain: 3,
    definition:
      "A hook that fires when the user submits a prompt, allowing context injection or validation before the model sees it.",
  },
  {
    term: "SessionStart hook",
    domain: 3,
    definition:
      "A hook that runs when a session begins, commonly used to load environment context or ensure tooling is ready.",
  },
  {
    term: "Headless mode (claude -p)",
    domain: 3,
    definition:
      "Running Claude Code non-interactively with a prompt and output format, enabling deterministic automation in CI pipelines.",
  },
  {
    term: "Permission modes",
    domain: 3,
    definition:
      "Settings controlling how much Claude Code can do without asking, from prompting on every action to pre-approved tool allow-lists.",
  },
  {
    term: "Tool allow-listing",
    domain: 3,
    definition:
      "Restricting which tools Claude Code may use (especially headless) so automated runs stay side-effect-safe and predictable.",
  },
  {
    term: "--fork-session",
    domain: 3,
    definition:
      "Resuming from an existing session but branching into a new one, so exploratory work does not mutate the original session's history.",
  },
  {
    term: "--continue / --resume",
    domain: 3,
    definition:
      "Claude Code flags to carry on the most recent session or reattach to a specific prior session by id.",
  },
  {
    term: "Claude Agent SDK",
    domain: 3,
    definition:
      "A programmable interface for building agents with the same building blocks as Claude Code: tools, hooks, sessions, MCP, and subagents.",
  },
  {
    term: "Iterative refinement",
    domain: 5,
    definition:
      "Improving a prompt or system through repeated cycles of test, measure, and adjust rather than accepting the first working version.",
  },
  {
    term: "Evaluation set",
    domain: 5,
    definition:
      "A fixed collection of representative cases with expected outcomes used to measure quality objectively as a system changes.",
  },
  {
    term: "Pass proxy",
    definition:
      "An unofficial practice threshold (this site uses 80%) standing in for the exam's scaled score, which is not a public raw percentage.",
  },
];
