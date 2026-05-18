# NotebookLM Bundle — Domain 1: Agentic Architecture & Orchestration

_Generated study bundle for the Claude Certified Architect (CCAF) exam. Offline build from the project study guide and flashcards. Not affiliated with Anthropic. Licensed CC BY 4.0._

## 1. Guide Sections

### 1. API Fundamentals and Output Control

### What to Know

Claude's Messages API is stateless. Claude does not remember previous API calls unless your application includes the relevant content in the next request. A production chat application must store the conversation and send the full current context on each turn: the system prompt, the selected prior messages, current application state, retrieved documents, and any tool results the model needs.

There is no magic memory flag that makes Claude remember earlier turns. A `session_id` in your own product, database, or orchestration layer can help you find stored history, but the model only sees what the request contains. If an assistant forgets facts from two turns ago in a short conversation, the most likely cause is that the application is not sending those prior messages.

As conversations grow, two things happen:

- Input token cost and latency increase because more context is sent every turn.
- The model has more competing information to attend to, including older user preferences, stale tool results, verbose RAG results, and its own earlier responses.

The Messages API uses a top-level `system` parameter for system prompts, not a `"system"` role inside `messages`. User and assistant turns go in `messages`. Tool use is represented with content blocks: assistant messages can contain `tool_use` blocks, and user messages can contain `tool_result` blocks.

### Structured Outputs and Tool Use as Output Control

Claude has two related ways to get machine-readable output:

- **JSON structured outputs** use `output_config.format` with a JSON Schema. Claude's direct text response is constrained to valid JSON matching that schema.
- **Tool use / strict tool use** constrains tool calls. You can define a tool with an input schema and read the model's `tool_use.input` as structured data, or use `strict: true` where supported to enforce tool-parameter schema compliance.

Use JSON structured outputs when the final assistant response itself should be JSON. Use tool use when the structured output represents a function call, extraction step, or intermediate agent action. These can be combined in workflows where the agent must both call tools with valid parameters and produce a structured final response.

For exam-style architecture questions, the key principle is stable: schema-backed output is more reliable than asking for free-form text that "looks like JSON."

`tool_choice` matters:

| Setting | Meaning | Use Case |
|---|---|---|
| `auto` | Claude may call a tool or answer normally | General agents where tool use is optional |
| `any` | Claude must call one of the provided tools | Extraction where the document type is unknown but one extraction tool from a defined set must be used |
| `tool` | Claude must call a specific named tool | A pipeline stage that must produce one schema before enrichment |
| `none` | Claude cannot call tools | Pure text response or a step where tools are unsafe/unneeded |

`tool_choice: "any"` is especially useful when you have several extraction tools (one per document type) and you want guaranteed tool use without choosing which schema in advance. Setting `auto` with prompt instructions to "use a tool" can still produce conversational text in edge cases; `any` cannot.

When multiple tools are available but one must run first, use `tool_choice` with a specific tool name (e.g., `{"type": "tool", "name": "extract_metadata"}`) for the first call, receive the structured result, then make subsequent calls for enrichment. Reordering tool definitions or relying on system prompt priority is unreliable.

For extraction systems, common patterns are:

1. Use `output_config.format` with a JSON Schema when you want the response body to be validated JSON.
2. Define an extraction tool whose input schema is the desired output schema when the extraction is modeled as a tool call.
3. Set `tool_choice` to a required tool or to `any` across several extraction tools when a tool call must happen.
4. Validate the result in application code.
5. If semantic validation fails, call Claude again with the source, the invalid extraction, and the validation errors. This validation-error feedback loop is far more effective than retrying the same prompt unchanged.

Tool definitions, tool schemas, output schemas, and tool-use/result blocks count as input tokens or add injected prompt overhead. A large schema (for example, a 12-field tool definition with detailed descriptions consuming ~2,500 tokens) combined with a long document can approach the context limit. When that happens, accuracy degrades on content near the end of the document because the model is processing close to the effective attention boundary. The root cause is total context consumption, not a model defect.

Structured outputs also have operational implications: the first request for a schema may have additional latency while the grammar is compiled; schemas are cached for reuse; very complex schemas can exceed compilation limits; refusals or max-token stops can still produce nonconforming output. Do not treat schema compliance as a substitute for domain validation.

### Partial Assistant Prefill

Claude can continue from a partially filled assistant response in some API patterns. This can be useful for response format control, such as starting directly with `{` for text JSON-style output or preventing repetitive greetings by providing a concise opening. Use this carefully: schema-constrained tool use is usually better than relying on text prefill for machine-readable output.

### Token Growth in Extended Conversations

Each new turn includes the entire conversation history in the request. As conversations grow:

- Input token count rises with every message.
- Latency rises proportionally because the model must attend to more input.
- Per-turn cost rises.

If users notice slower responses and higher costs in long sessions, the cause is almost always input token growth, not a defect in the model or database. Context management strategies (sliding window, progressive summarization, structured state) address this directly.

### Common Pitfalls

> [!WARNING]
> **Assuming Claude has persistent memory.** It does not. Your app manages state and history.

> [!WARNING]
> **Treating `session_id` as model memory.** A session identifier can locate stored context in your system, but it does not automatically change what Claude sees.

> [!WARNING]
> **Forcing text JSON with prompt instructions when tool use is available.** Prompt-only JSON is more fragile than schema-backed tool use. Also: ignoring tool-definition token cost, and confusing `tool_choice: "auto"` with required tool use (`auto` allows tools; only `any` or a named tool guarantees a tool call).

### Original Example

Suppose a maintenance report parser must return:

```json
{
  "site_name": "string",
  "reported_by": "string|null",
  "observed_issues": ["string"],
  "service_visits": [
    {
      "technician": "string",
      "work_performed": "string",
      "visit_date": "YYYY-MM-DD|null"
    }
  ]
}
```

The reliable design is not "Respond only with valid JSON." Define an `extract_candidate_profile` tool with that schema, force that tool, and validate the resulting input object. If validation fails because a date is malformed, feed back the exact validation error rather than retrying blindly.

---

### 8. Agentic Patterns and Task Decomposition

### What to Know

Agentic applications run a loop: observe, reason, act, observe again. The model sees current context, chooses a tool or response, incorporates results, and continues until the task is done or blocked.

The architecture question is how much autonomy to give the model and how to structure the work.

### Core Patterns

| Pattern | Best For | Avoid When |
|---|---|---|
| Prompt chaining | Fixed workflows with known steps | The path depends heavily on findings |
| Routing | Inputs fall into distinct handling categories | Categories are fuzzy or evolving rapidly |
| Orchestrator-workers | A coordinator chooses and delegates subtasks | A simple fixed chain would be cheaper |
| Dynamic decomposition | Investigation where each discovery changes the plan | The task is mechanical and well-defined |
| Parallel subagents | Independent workstreams | Workstreams depend on each other's results |

Examples:

- Use prompt chaining for a fixed three-stage review: style, security, documentation.
- Use routing when invoices, receipts, and contracts require different extraction tools.
- Use orchestrator-workers when a research coordinator decides which specialists to invoke.
- Use dynamic decomposition for debugging an intermittent backend failure.
- Use parallel subagents when several independent documents or repositories can be analyzed separately.

The decision is not "which pattern is best" but "which pattern matches the shape of this work." Prompt chaining adds reliability by constraining the model to a known sequence; pay that cost when the steps really are fixed and skip it when the work is exploratory. Dynamic decomposition is appropriate when the next step genuinely depends on what the model just learned — for example, an investigation where the first finding determines whether to gather logs, query a database, or interview a stakeholder. Hard-coding investigation steps tends to either miss the actual problem or waste effort gathering irrelevant data.

A useful contrast: a billing-dispute resolution workflow that always runs "verify identity → fetch invoice → check policy → propose adjustment" is a good fit for prompt chaining. A security incident triage that runs "examine alert → decide whether to pull logs, query a SIEM, page on-call, or all three" is a good fit for dynamic decomposition. Forcing chaining onto the second wastes coordinator effort and produces shallow analyses; forcing decomposition onto the first invites unnecessary tool calls and inconsistent outputs.

Dynamic decomposition specifically suits investigations where the next move only becomes clear after the current finding. Debugging an intermittent backend failure, root-causing a customer's unusual error report, or narrowing down a flaky test all share that shape: the model cannot write a fixed plan upfront because what to look at next depends on what the previous step revealed. A pre-written debugging checklist often misses the actual cause and runs every step regardless. With dynamic decomposition, the coordinator commits to a goal (find the cause), inspects what it has, and decides the next action — gather logs, examine config, reproduce locally, escalate — based on the current evidence. The trade-off is unpredictability: dynamic plans are harder to budget for than fixed chains, so set explicit termination criteria and step caps.

### When the Coordinator Should Not Delegate

Subagents add overhead. Each delegation incurs a tool call, a fresh context, a separate model invocation, and a result-passing step. When the coordinator already has the relevant context and the work is small, calling a subagent is slower and more expensive than just doing the work in the coordinator's turn. Save delegation for cases where the task would flood the coordinator's context (a long document analysis), genuinely needs a different prompt or tool set (a specialist persona), or can run in parallel with other work. For "summarize these three sentences I just retrieved," let the coordinator answer.

### Parallel Subagents Across a Partition

When a single large task can be cut into independent pieces — auditing 50 repositories, analyzing 30 documents, scanning 100 dependencies — the right pattern is partition-then-parallel: the coordinator divides the input set into N roughly equal chunks, spawns N subagents (one per chunk), and synthesizes their structured outputs. Each subagent works only on its slice of the partition, returning a uniform result shape the coordinator can merge.

This pattern wins when the work is uniform enough that the coordinator can describe each subagent's job from a template and the units do not need to consult one another. Total elapsed time becomes max(subagent_durations), so balance partitions by expected effort rather than by raw count. If a few partitions are far heavier than the rest, the slowest one dictates total time and the parallelism is wasted.

Avoid this pattern when units depend on each other's findings (a finding from repo A must inform the analysis of repo B), when the partition would split a logical unit (chopping a document mid-section), or when sequential streaming output to the user matters more than total throughput.

### Multi-Agent Context Passing

Subagents do not automatically share the parent's conversation state. When the parent agent invokes a subagent (in the Claude Agent SDK, this typically happens through a Task or Agent tool), the subagent starts a fresh conversation. It receives only what the parent explicitly passes — usually the prompt the parent constructed, plus the subagent's own definition (system prompt, allowed tools, model selection). It does not see the parent's prior user turns, prior assistant turns, prior tool results, or memory of earlier subagent runs.

Two consequences follow. First, every piece of context the subagent needs has to be in the prompt the parent constructs: the goal, the relevant findings, the constraints, the expected output shape, the source references. Second, a "resume the previous research subagent" pattern doesn't exist by default — calling the Agent tool again starts a brand-new agent. If you need continuity, the parent must persist an identifier and pass it through, or include the prior summary in the new prompt.

A coordinator must therefore pass the context each subagent needs. Usually that means a concise task, relevant findings, source references, constraints, and expected output shape.

Poor handoff:

```text
Synthesize the findings.
```

Better handoff:

```text
Synthesize the following claim-source records into an executive summary. Preserve uncertainty, cite each claim with its source_id, and separate established findings from contested findings.
```

For final report generation, do not pass only a prose summary if citations are required. Pass a structured source index that maps claims to source IDs, URLs, excerpts, dates, and confidence/uncertainty notes.

### Tool Distribution Across Agents

More tools are not always better. Giving every subagent every tool increases selection complexity and can lead agents outside their role. Restrict tools to what each subagent needs.

Examples:

- A web research subagent needs search and fetch tools.
- A document analysis subagent needs document-read/extraction tools.
- A synthesis subagent may need no external search tools if it should only work from supplied findings.
- A report generator needs formatting and citation inputs, not raw broad search.

In the Claude Agent SDK, the mechanism for delegating to a subagent is itself a tool — typically named `Task` or `Agent`. For the parent to spawn a subagent, this tool must appear in the parent's `allowedTools` list. Forgetting to allow the Task/Agent tool is a common reason an "orchestrator" cannot delegate at all: the subagent definitions exist, but the parent has no callable interface to launch them. The subagent's own `allowedTools` is configured separately in the AgentDefinition and constrains what the subagent can do once spawned.

### Parallel Execution

If tasks are independent, the coordinator should start them concurrently rather than serially. In tool-calling systems, that often means emitting multiple tool calls in one assistant turn when the platform supports parallel tool calls. In an external orchestrator, it may mean launching concurrent SDK calls and aggregating results.

Do not parallelize when the second task needs the first task's output. For example, document analysis cannot inspect sources until sources are identified, but analyzing independent source documents can run in parallel after retrieval.

A common phasing pattern is: serial decomposition (one model call to plan and identify the independent units of work) followed by parallel execution (each unit runs as its own subagent or tool call concurrently) followed by serial synthesis (one final call assembles the results). The parallel phase wins the most latency back when subtasks involve I/O — fetches, searches, document analyses — because elapsed time becomes max(subtask_durations) instead of sum(subtask_durations). For CPU-bound or token-bound work the speedup is smaller. When subtasks have differing latency, the slowest determines total time, so balance work across subagents rather than letting one of them carry an outsized share.

### State Persistence

Long-running multi-agent workflows need durable state. Persist structured exports, not only transcripts:

```json
{
  "workflow_id": "research_2026_04_30",
  "completed_steps": ["source_search", "source_screening"],
  "documents": [
    {
      "source_id": "src_17",
      "status": "analyzed",
      "claims": ["claim_40", "claim_41"]
    }
  ],
  "open_gaps": ["recent regulatory changes"]
}
```

On resume, the coordinator loads the manifest and injects only relevant state into each agent prompt. This is more efficient than replaying every subagent transcript.

### Provenance, Time, and Uncertainty

Research agents must preserve provenance and dates. Without dates, a synthesis agent may treat older and newer statistics as contradictory when they actually show a trend. Without source mapping, claims lose citations. Without uncertainty structure, reports become either overconfident or over-hedged.

Ask subagents to output:

- Claim.
- Source ID and location.
- Publication or data collection date.
- Methodology notes.
- Confidence or uncertainty language from the source.
- Whether the finding is established, contested, or insufficiently supported.

Render different content types appropriately. Financial metrics may belong in tables; qualitative developments may belong in prose; patent categories may belong in grouped lists.

### Common Pitfalls

> [!WARNING]
> **Using a full pipeline for simple facts.** Let the coordinator choose a smaller path for simple queries. Strict one-pass research: if analysis finds gaps, the coordinator should trigger targeted follow-up search.

> [!WARNING]
> **Passing raw 100K-token outputs between every agent.** Pass structured summaries plus source indexes.

> [!WARNING]
> **Over-prescribing subagents.** Give goals and quality criteria, not brittle step-by-step search strings, when adaptability matters.

---

### 9. Customer Service and Production Workflow Design

### What to Know

Customer service agents combine tool use, policy, state, escalation, and user experience. The agent should resolve what it can, escalate when it should, and communicate uncertainty honestly.

### Escalation

Escalate when:

- The user explicitly asks for a human and the issue cannot be resolved immediately without overriding their preference.
- The issue requires authority the agent does not have.
- A policy exception, regulated approval, or high-value transaction is involved.
- The agent cannot make meaningful progress.
- Tool results show an uncertain or unsafe state that requires human judgment.

Do not rely on simplistic counters such as "escalate after three failed tools." The category and impact of the failure matter more than the count.

When escalating, pass a structured handoff:

```json
{
  "customer_id": "cust_193",
  "issue_type": "billing_adjustment",
  "root_cause": "subscription tier mismatch",
  "relevant_records": ["invoice_8841", "case_2209"],
  "amount": 72.15,
  "actions_taken": ["verified account", "checked invoice"],
  "recommended_next_action": "manager approval for adjustment"
}
```

Do not pass only the user's first complaint. Do not dump the full transcript unless the receiving system can use it.

### Frustrated Users

When a user is frustrated, acknowledge the frustration and move efficiently. If the issue is straightforward and the user asks for a human, offer the immediate resolution while preserving their choice:

```text
I can resolve this now, and I can also transfer you if you prefer. The eligible action is ready; would you like me to complete it or connect you to a specialist?
```

Do not silently perform account actions after a frustrated user asks for a person. Do not make them answer a long intake questionnaire if one targeted question is enough.

### Compliance and Authorization

Hard rules must be enforced programmatically:

- Refunds above a threshold.
- Reimbursements requiring manager approval.
- Regulated financial or healthcare workflows.
- Destructive infrastructure operations.

Use tool-level enforcement, middleware, permissions, or hooks. Prompt instructions can guide behavior but are not tamper-proof.

The safest design often puts the rule inside the tool itself. For example, `process_reimbursement` can internally disburse amounts below a threshold and create a pending manager approval above it. This prevents the model from bypassing the rule by choosing the wrong tool or setting an approval flag incorrectly.

A few patterns work well in combination, and the exam tends to test the difference:

- **Threshold enforcement inside the tool.** The tool reads the threshold from a server-controlled source — feature flag, policy service, account record — not from a parameter the model passes. The model can call `issue_credit(amount=…)` but cannot raise the cap by setting `override=true`, because no such parameter exists on the public interface. If a model call exceeds the limit, the tool returns a structured "requires_approval" result, not a silent failure.
- **Preview-then-execute with single-use tokens.** For high-impact actions (closing accounts, charging cards, sending external notifications), split the operation into two tools: a preview tool that returns a redacted summary plus a one-time execution token, and an execute tool that consumes that token. The model presents the preview to the user verbatim, the user confirms, and only then does the execute tool fire. The token is short-lived and bound to the previewed payload; the model cannot construct a token from scratch or reuse one with different parameters.
- **Server-side authorization checks before any state change.** Even when the model is well-behaved, the tool should re-verify the caller's authority on every invocation. "The model already checked policy" is not a defense. Tools live inside the trust boundary; they must validate.

Avoid letting prompt instructions ("never refund above $50 without manager approval") be the only line of defense. Adversarial users, prompt-injection in retrieved content, or a malformed tool description can all push the model past prose rules. Defense-in-depth means: prompt rules to bias the agent, tool implementations to enforce, and audit logs to detect.

### Graceful Degradation

If a tool fails mid-workflow, the agent should still deliver useful progress:

- Explain what has been verified.
- State what could not be completed.
- Be transparent about system issues.
- Offer next steps such as retry, escalation, or notification.

Do not claim a side effect will happen if the system has not completed it. Do not immediately escalate when the agent can still answer part of the user's problem.

For partial completion, prefer "here is what is done, here is what is pending, here is how we can finish" over either a flat success message or a generic "we hit an error." Users tolerate visible incompleteness; they do not tolerate later discovering that an action they thought was completed had silently rolled back. When the same tool keeps failing on the same input, treat it as a signal to switch strategies — try a different tool, ask a clarifying question, or escalate — rather than burning more retries on the same call.

### Common Pitfalls

> [!WARNING]
> **Escalating with no useful handoff.** Human agents need context and recommendations.

> [!WARNING]
> **Processing high-risk actions based on prompt rules.** Use code-level enforcement. Retrying uncertain writes: avoid duplicate charges, messages, or postings.

> [!WARNING]
> **Over-automating user confirmation.** Show concrete action details.

---

## 2. Flashcards

**Q:** What loop do agentic applications run?

**A:** They run an observe-reason-act-observe loop: the model sees current context, chooses a tool or response, incorporates results, and continues until the task is done or blocked.

_(difficulty: easy; tags: agentic-loop, observe-act)_

---

**Q:** Which agentic pattern fits a fixed three-stage code review (style, then security, then documentation)?

**A:** Prompt chaining, because the steps are known and fixed; chaining adds reliability by constraining the model to a known sequence.

_(difficulty: easy; tags: prompt-chaining, patterns)_

---

**Q:** Which pattern fits routing invoices, receipts, and contracts to different extraction tools?

**A:** Routing: inputs fall into distinct handling categories, so you classify then dispatch to the right handler.

_(difficulty: easy; tags: routing, patterns)_

---

**Q:** Which pattern fits debugging an intermittent backend failure where each finding changes the plan?

**A:** Dynamic decomposition, because the next step genuinely depends on what the model just learned; a fixed checklist would miss the actual cause.

_(difficulty: medium; tags: dynamic-decomposition, investigation)_

---

**Q:** Which pattern fits a research coordinator that decides which specialist subagents to invoke?

**A:** Orchestrator-workers: a coordinator chooses and delegates subtasks rather than following a fixed chain.

_(difficulty: easy; tags: orchestrator-workers, patterns)_

---

**Q:** When should you avoid the parallel-subagents pattern?

**A:** When workstreams depend on each other's results, when the partition would split a logical unit, or when sequential streaming output matters more than throughput.

_(difficulty: medium; tags: parallel-subagents, dependencies)_

---

**Q:** A billing-dispute workflow always runs verify identity, fetch invoice, check policy, propose adjustment. Chaining or dynamic decomposition?

**A:** Prompt chaining: the steps are genuinely fixed, so chaining gives reliability and consistent outputs; dynamic decomposition would invite unnecessary tool calls.

_(difficulty: medium; tags: prompt-chaining, customer-service)_

---

**Q:** A security incident triage must decide whether to pull logs, query a SIEM, page on-call, or all three. Which pattern?

**A:** Dynamic decomposition: the next move only becomes clear after the current finding, so a fixed chain would produce shallow analyses.

_(difficulty: medium; tags: dynamic-decomposition, triage)_

---

**Q:** Why is the choice of agentic pattern framed as matching the shape of work rather than picking the best pattern?

**A:** Each pattern trades reliability against adaptability; chaining suits fixed steps while decomposition suits exploratory work, so the right one depends on the task structure.

_(difficulty: hard; tags: patterns, design-tradeoff)_

---

**Q:** The user asks the coordinator to summarize three sentences it just retrieved. Delegate to a subagent or answer directly?

**A:** Answer directly: delegation adds a tool call, fresh context, separate invocation, and result passing; that overhead is wasteful when the coordinator already has the context and the work is small.

_(difficulty: medium; tags: delegation, overhead)_

---

**Q:** Name three cases where delegating to a subagent is worthwhile despite its overhead.

**A:** When the task would flood the coordinator's context, when it needs a different prompt or tool set (specialist persona), or when it can run in parallel with other work.

_(difficulty: easy; tags: delegation, subagents)_

---

**Q:** What is the partition-then-parallel pattern for auditing 50 repositories?

**A:** The coordinator divides the input into N roughly equal chunks, spawns N subagents (one per chunk), and synthesizes their uniform structured outputs.

_(difficulty: medium; tags: partition-parallel, subagents)_

---

**Q:** In partition-then-parallel work, why balance partitions by expected effort, not raw count?

**A:** Total elapsed time becomes max(subagent_durations); if a few partitions are far heavier, the slowest one dictates total time and the parallelism is wasted.

_(difficulty: hard; tags: parallel-execution, load-balancing)_

---

**Q:** Does a subagent automatically share the parent agent's conversation state?

**A:** No. A subagent starts a fresh conversation and sees only what the parent explicitly passes plus its own AgentDefinition; it does not see prior user turns, assistant turns, or tool results.

_(difficulty: easy; tags: subagent-context, isolation)_

---

**Q:** Since subagents do not inherit context, what must the parent put in the subagent prompt?

**A:** Everything the subagent needs: the goal, relevant findings, constraints, source references, and the expected output shape.

_(difficulty: medium; tags: subagent-context, handoff)_

---

**Q:** Why doesn't a "resume the previous research subagent" pattern exist by default?

**A:** Calling the Agent/Task tool again starts a brand-new agent; for continuity the parent must persist an identifier or include the prior summary in the new prompt.

_(difficulty: medium; tags: subagent-context, state)_

---

**Q:** Critique the subagent handoff "Synthesize the findings."

**A:** It is too vague; a good handoff specifies the records, requires preserving uncertainty, citing each claim with its source_id, and separating established from contested findings.

_(difficulty: medium; tags: handoff, provenance)_

---

**Q:** For final report generation requiring citations, what should the coordinator pass to the report subagent?

**A:** A structured source index mapping claims to source IDs, URLs, excerpts, dates, and confidence/uncertainty notes - not only a prose summary.

_(difficulty: medium; tags: report-generation, provenance)_

---

**Q:** Why shouldn't every subagent inherit every tool?

**A:** More tools increase selection complexity and can lead agents outside their role; restricting tools to what each subagent needs improves focus and security.

_(difficulty: easy; tags: tool-distribution, subagents)_

---

**Q:** What tools does a synthesis subagent that should only work from supplied findings need?

**A:** Generally no external search tools; it should work only from the findings the coordinator passes so it does not introduce unsourced content.

_(difficulty: medium; tags: tool-distribution, synthesis)_

---

**Q:** In the Claude Agent SDK, what must be in the parent's allowedTools for it to spawn subagents?

**A:** The delegation tool itself (typically named Task or Agent); without it the parent has no callable interface to launch the subagent definitions.

_(difficulty: medium; tags: agent-sdk, delegation)_

---

**Q:** An orchestrator describes delegation but no subagent ever runs. What is the most likely cause?

**A:** The Task/Agent tool is not in the parent's allowedTools, so the parent has no interface to launch subagents even though the definitions exist.

_(difficulty: hard; tags: agent-sdk, delegation, debugging)_

---

**Q:** When should a coordinator start independent tasks concurrently?

**A:** When the tasks do not depend on each other's output; parallel execution turns elapsed time into max(durations) instead of sum, especially for I/O-bound work.

_(difficulty: medium; tags: parallel-execution, latency)_

---

**Q:** When must you NOT parallelize two tasks?

**A:** When the second task needs the first task's output - e.g., document analysis cannot inspect sources until the sources are identified.

_(difficulty: easy; tags: parallel-execution, dependencies)_

---

**Q:** Describe the common three-phase agentic phasing pattern.

**A:** Serial decomposition (one call plans the independent units), then parallel execution (each unit runs concurrently), then serial synthesis (one final call assembles results).

_(difficulty: medium; tags: phasing, parallel-execution)_

---

**Q:** For which kind of subtasks does the parallel phase win the most latency back?

**A:** I/O-bound subtasks (fetches, searches, document analyses), because elapsed time becomes max(durations); CPU- or token-bound work sees a smaller speedup.

_(difficulty: hard; tags: parallel-execution, latency)_

---

**Q:** Why persist structured exports rather than only transcripts for long multi-agent workflows?

**A:** On resume the coordinator can load a manifest and inject only relevant state into each agent prompt, which is more efficient than replaying every subagent transcript.

_(difficulty: medium; tags: state-persistence, resume)_

---

**Q:** What does a workflow state manifest typically contain?

**A:** Workflow id, completed steps, per-document status with claim IDs, and open gaps - durable structured state, not raw conversation.

_(difficulty: easy; tags: state-persistence, manifest)_

---

**Q:** Why must research agents preserve publication or data-collection dates with each claim?

**A:** Without dates a synthesis agent may treat older and newer statistics as contradictory when they actually show a trend over time.

_(difficulty: hard; tags: provenance, dates)_

---

**Q:** What should research subagents output per finding for trustworthy synthesis?

**A:** Claim, source ID and location, publication/data date, methodology notes, source confidence language, and whether the finding is established, contested, or insufficiently supported.

_(difficulty: medium; tags: provenance, uncertainty)_

---

**Q:** When should a customer-service agent escalate to a human?

**A:** When the user explicitly asks and the issue cannot be resolved without overriding them, the issue needs authority the agent lacks, a policy exception or high-value transaction is involved, no meaningful progress is possible, or tool results show an unsafe state needing human judgment.

_(difficulty: medium; tags: escalation, customer-service)_

---

**Q:** Why is "escalate after three failed tool calls" a poor escalation rule?

**A:** The category and impact of a failure matter more than the count; a simplistic counter ignores whether the failure is recoverable or critical.

_(difficulty: hard; tags: escalation, heuristics)_

---

**Q:** What should an escalation handoff contain?

**A:** A structured handoff: customer ID, issue type, root cause, relevant records, amount, actions taken, and recommended next action - not just the first complaint or a raw transcript dump.

_(difficulty: easy; tags: escalation, handoff)_

---

**Q:** A frustrated user asks for a human but the issue is straightforward and resolvable. What should the agent do?

**A:** Acknowledge the frustration, offer the immediate resolution while preserving their choice to be transferred, and let them pick - do not silently perform the account action.

_(difficulty: medium; tags: frustrated-users, escalation)_

---

**Q:** Which customer-service rules must be enforced programmatically rather than by prompt?

**A:** Hard rules: refunds above a threshold, reimbursements needing manager approval, regulated financial/healthcare workflows, and destructive infrastructure operations.

_(difficulty: easy; tags: compliance, enforcement)_

---

**Q:** Why put a reimbursement threshold rule inside the process_reimbursement tool itself?

**A:** So the model cannot bypass it by choosing the wrong tool or setting an approval flag incorrectly; the tool disburses below the threshold and creates a pending approval above it.

_(difficulty: medium; tags: compliance, tool-enforcement)_

---

**Q:** Where should a credit-limit threshold value come from, and why?

**A:** From a server-controlled source (feature flag, policy service, account record), not a model-passed parameter, so the model cannot raise the cap by setting something like override=true.

_(difficulty: hard; tags: compliance, threshold-enforcement)_

---

**Q:** Describe preview-then-execute with single-use tokens for a high-impact action.

**A:** A preview tool returns a redacted summary plus a short-lived one-time token bound to that payload; the user confirms; the execute tool consumes the token. The model cannot forge or reuse a token with different parameters.

_(difficulty: medium; tags: preview-execute, safety)_

---

**Q:** Why re-verify the caller's authority on every tool invocation even when the model behaved correctly?

**A:** Tools live inside the trust boundary and must validate; "the model already checked policy" is not a defense against adversarial input or prompt injection.

_(difficulty: medium; tags: authorization, defense-in-depth)_

---

**Q:** What does defense-in-depth mean for customer-service compliance?

**A:** Prompt rules bias the agent, tool implementations enforce the hard rule, and audit logs detect violations - prose rules alone can be pushed past by adversarial users or prompt injection.

_(difficulty: hard; tags: defense-in-depth, compliance)_

---

**Q:** How should an agent handle a tool failing mid-workflow (graceful degradation)?

**A:** Explain what was verified, state what could not be completed, be transparent about the system issue, and offer next steps like retry, escalation, or notification.

_(difficulty: medium; tags: graceful-degradation, customer-service)_

---

**Q:** Why prefer "here is what is done, here is what is pending" over a flat success message after partial completion?

**A:** Users tolerate visible incompleteness but not later discovering a supposedly completed action silently rolled back; never claim a side effect that did not finish.

_(difficulty: medium; tags: graceful-degradation, transparency)_

---

**Q:** When the same tool keeps failing on the same input, what should the agent do?

**A:** Treat it as a signal to switch strategies - try a different tool, ask a clarifying question, or escalate - rather than burning more retries on the same call.

_(difficulty: medium; tags: retry, strategy-switch)_

---

**Q:** Why not use a full research pipeline for a simple factual query?

**A:** The coordinator should choose a smaller path for simple queries; running the whole pipeline wastes calls and latency for facts that need no decomposition.

_(difficulty: easy; tags: coordinator, efficiency)_

---

**Q:** If one-pass research finds gaps, what should the coordinator do?

**A:** Trigger a targeted follow-up search; a strict single-pass design leaves known gaps unanswered.

_(difficulty: medium; tags: coordinator, iteration)_

---

**Q:** Why not pass raw 100K-token outputs between every agent in a pipeline?

**A:** It floods context and cost; pass structured summaries plus source indexes so downstream agents get what they need without the bulk.

_(difficulty: medium; tags: context-passing, efficiency)_

---

**Q:** When should you give subagents goals and quality criteria instead of brittle step-by-step search strings?

**A:** When adaptability matters; over-prescribed steps stop the subagent from adjusting to what it finds, while goals plus criteria let it adapt.

_(difficulty: hard; tags: subagent-design, autonomy)_

---

**Q:** What is the trade-off of dynamic decomposition versus a fixed chain?

**A:** Dynamic plans adapt to findings but are unpredictable and hard to budget, so you must set explicit termination criteria and step caps.

_(difficulty: hard; tags: dynamic-decomposition, termination)_

---

**Q:** Why is starting a fixed debugging checklist often the wrong approach for an intermittent failure?

**A:** A pre-written checklist often misses the actual cause and runs every step regardless; the cause only becomes clear after each finding, which is what dynamic decomposition handles.

_(difficulty: hard; tags: dynamic-decomposition, debugging)_

---

**Q:** For multi-issue customer sessions across many turns, how can the agent reliably answer "what happened with my refund?"

**A:** Track each issue's current status (order ID, amounts, resolution state) in structured state independent of the linear conversation.

_(difficulty: medium; tags: structured-state, customer-service)_


## 3. Anti-Patterns and Common Pitfalls

### Pitfalls — API Fundamentals and Output Control

> [!WARNING]
> **Assuming Claude has persistent memory.** It does not. Your app manages state and history.

> [!WARNING]
> **Treating `session_id` as model memory.** A session identifier can locate stored context in your system, but it does not automatically change what Claude sees.

> [!WARNING]
> **Forcing text JSON with prompt instructions when tool use is available.** Prompt-only JSON is more fragile than schema-backed tool use. Also: ignoring tool-definition token cost, and confusing `tool_choice: "auto"` with required tool use (`auto` allows tools; only `any` or a named tool guarantees a tool call).

### Pitfalls — Agentic Patterns and Task Decomposition

> [!WARNING]
> **Using a full pipeline for simple facts.** Let the coordinator choose a smaller path for simple queries. Strict one-pass research: if analysis finds gaps, the coordinator should trigger targeted follow-up search.

> [!WARNING]
> **Passing raw 100K-token outputs between every agent.** Pass structured summaries plus source indexes.

> [!WARNING]
> **Over-prescribing subagents.** Give goals and quality criteria, not brittle step-by-step search strings, when adaptability matters.

---

### Pitfalls — Customer Service and Production Workflow Design

> [!WARNING]
> **Escalating with no useful handoff.** Human agents need context and recommendations.

> [!WARNING]
> **Processing high-risk actions based on prompt rules.** Use code-level enforcement. Retrying uncertain writes: avoid duplicate charges, messages, or postings.

> [!WARNING]
> **Over-automating user confirmation.** Show concrete action details.

---

## 4. Exam Reasoning Checklist

When faced with a scenario, identify:

1. Is the failure caused by missing context, bad tool design, bad prompt design, or missing programmatic enforcement?
2. Is the needed behavior probabilistic guidance or deterministic policy?
3. Does the model need to inspect intermediate results before acting?
4. Is the data absent, ambiguous, stale, or contradictory?
5. Is the operation interactive, asynchronous, or high volume?
6. Does a human need raw transcript, structured handoff, or source citations?
7. Are we optimizing for accuracy, cost, latency, safety, or developer workflow?

---
