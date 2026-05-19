/**
 * Original hands-on build exercises for the CCAF study system. Authored for
 * this project and grounded in guide/exam-preparation-guide.md's practice
 * framing and the five exam domains. `reviewSlugs` are /learn/<domain> slugs.
 */

export interface Exercise {
  id: string;
  title: string;
  primaryDomains: number[];
  objective: string;
  steps: string[];
  success: string;
  /** Curriculum domain slugs to reread before/after. */
  reviewSlugs: string[];
}

export const EXERCISES: Exercise[] = [
  {
    id: "agentic-loop",
    title: "Build an agentic loop with tool use and structured errors",
    primaryDomains: [1, 2],
    objective:
      "Implement a minimal agent that calls a tool, returns the result correctly, and keeps looping until the model is done — degrading gracefully when the tool fails.",
    steps: [
      "Define one tool with a clear name, description, and JSON Schema for its inputs.",
      "Call the Messages API with the tool defined and a task that requires it.",
      "When stop_reason is \"tool_use\", execute the tool and return a tool_result block whose tool_use_id matches the request.",
      "Loop: resend the full message history and continue until stop_reason is \"end_turn\".",
      "Make the tool fail on one input. Return the failure as an in-band error result (not a thrown exception) so the model can react.",
      "Add a guard that escalates or stops after a bounded number of loop iterations.",
    ],
    success:
      "The agent completes a multi-step task, the loop terminates on \"end_turn\", and a tool failure produces a sensible recovery instead of a crash or infinite loop.",
    reviewSlugs: ["1-agentic-architecture", "2-tool-design-mcp"],
  },
  {
    id: "claude-code-config",
    title: "Configure Claude Code: memory, hooks, command, MCP",
    primaryDomains: [3],
    objective:
      "Stand up a repository so Claude Code behaves predictably: durable conventions, an automated guardrail, a reusable workflow, and an external tool source.",
    steps: [
      "Write a CLAUDE.md with project conventions and constraints; split a section out via an @import.",
      "Add a PreToolUse hook that blocks an action you never want taken automatically.",
      "Create a custom slash command that runs a repeatable task (e.g. a review pass).",
      "Register an MCP server and confirm its tools/resources appear to the agent.",
      "Run the same task headlessly with claude -p and a restricted tool allow-list.",
    ],
    success:
      "Conventions are honored without re-explaining them, the hook blocks the disallowed action, the slash command reproduces the workflow, and the headless run is deterministic and side-effect-safe.",
    reviewSlugs: ["3-claude-code-config"],
  },
  {
    id: "structured-extraction",
    title: "Structured extraction pipeline with validation-retry",
    primaryDomains: [4, 2],
    objective:
      "Extract schema-valid records from messy input reliably, rejecting and repairing malformed output instead of trusting the first response.",
    steps: [
      "Model the target record as a strict JSON Schema bound to a single tool.",
      "Force that tool with tool_choice so the model must return the structured shape.",
      "Validate every result against the schema and any business rules.",
      "On failure, feed the validation error back and retry with bounded attempts.",
      "Add prefilling to stabilize the output start and compare reliability with and without it.",
    ],
    success:
      "Valid inputs yield schema-conformant records first try; malformed cases are caught, repaired on retry, and never passed downstream unvalidated.",
    reviewSlugs: ["4-prompt-engineering", "2-tool-design-mcp"],
  },
  {
    id: "coordinator-subagents",
    title: "Coordinator plus parallel subagents with provenance",
    primaryDomains: [1, 5],
    objective:
      "Decompose a research task across isolated subagents and synthesize their findings while keeping every claim traceable to a source.",
    steps: [
      "Have a lead agent plan the task and split it into independent subtasks.",
      "Dispatch each subtask to a subagent with its own isolated context.",
      "Return findings as structured state, each item tagged with its source.",
      "Synthesize results in the lead agent, preserving claim-to-source mapping.",
      "Measure context growth and confirm subagent contexts did not leak into the lead's.",
    ],
    success:
      "The final synthesis is coherent, every claim maps to a source, and the orchestrator's context stays bounded regardless of subagent count.",
    reviewSlugs: ["1-agentic-architecture", "5-context-management"],
  },
  {
    id: "batch-sla",
    title: "Batch SLA design with failure handling",
    primaryDomains: [5],
    objective:
      "Process a large workload economically with the Message Batches API and reconcile asynchronous, out-of-order, partially-failing results.",
    steps: [
      "Partition the workload and attach a unique custom_id to each request.",
      "Submit the batch and design the wait around its asynchronous window.",
      "Map returned results back to inputs by custom_id (do not rely on order).",
      "Detect per-item failures and define a retry-or-skip policy for them.",
      "Compare cost and latency against a synchronous baseline and document the trade-off.",
    ],
    success:
      "Every input is accounted for via custom_id, partial failures are handled deliberately, and the cost/latency trade-off versus synchronous calls is quantified.",
    reviewSlugs: ["5-context-management"],
  },
  {
    id: "srs-reviewer",
    title: "Spaced-repetition reviewer agent",
    primaryDomains: [4, 5],
    objective:
      "Build an agent that quizzes you from study material, grades answers with structured output, and schedules the next review using a Leitner policy.",
    steps: [
      "Use the system parameter to fix the grader's role and rubric.",
      "Have the agent return each grade as structured output (correct/again/hard/good plus rationale).",
      "Apply a Leitner schedule: promote on success, demote on a miss.",
      "Persist only compact structured state between sessions, not full transcripts.",
      "Add an evaluation set of known questions to check grading consistency over time.",
    ],
    success:
      "Grades are consistent and schema-valid, due items resurface on schedule, and state stays compact enough to resend cheaply across sessions.",
    reviewSlugs: ["4-prompt-engineering", "5-context-management"],
  },
];
