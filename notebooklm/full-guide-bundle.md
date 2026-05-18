# NotebookLM Bundle — Full Guide + All Flashcards

_Complete offline study bundle for the Claude Certified Architect (CCAF) exam. Not affiliated with Anthropic. Licensed CC BY 4.0._

## Study Guide

# Claude Certified Architect – Foundations: Exam Preparation Guide

> An independent, community-created study system for the **Claude Certified
> Architect – Foundations (CCAF)** exam. Not affiliated with, endorsed by, or
> sponsored by Anthropic. Licensed CC BY 4.0.

## Before You Start

This is an independent, community-created study guide. It is not affiliated
with, endorsed by, or sponsored by Anthropic.

No exam questions are included, paraphrased, or hinted at. The guide teaches
the underlying architecture concepts, trade-offs, and implementation patterns
that a practitioner should understand.

This work is licensed under Creative Commons Attribution 4.0 International. You
may share and adapt it with attribution.

## How to Use This Guide

Read the chapters in order if you are new to production LLM systems. If you
already build with Claude, use the chapter list to jump directly to weaker
areas, then use the quick reference near the end as a final review.

For each topic, focus on the design trade-off being tested:

- Where should responsibility live: model, application code, tool, schema, or human reviewer?
- Which behavior needs deterministic enforcement instead of prompt guidance?
- What context, state, or provenance must be preserved for the workflow to be reliable?
- Which failures should be retried, escalated, validated, or treated as impossible to infer?

The goal is not memorization. A strong answer explains why a design fits the
scenario's constraints.

## Overview

This guide teaches the architecture knowledge needed to design, build, and operate production systems with Claude, Claude Code, the Claude Agent SDK, tools, and MCP integrations. It is intentionally scenario-oriented: the exam is likely to test trade-offs, not rote definitions.

The most important habit is to ask: where should responsibility live?

- The model is good at interpreting language, choosing among well-described options, synthesizing evidence, and adapting plans.
- Application code is responsible for deterministic guarantees: permissions, compliance thresholds, state persistence, retries, idempotency, validation, and auditability.
- Tool and schema design shape the model's behavior. A vague tool or underspecified schema creates model errors that look like "reasoning" failures but are really interface failures.

This guide avoids exam-question content. The examples are original teaching examples that illustrate the underlying concepts.

---

## 1. API Fundamentals and Output Control

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

## 2. Designing Tool Interfaces for LLM Agents

### What to Know

An agent selects tools from their names, descriptions, parameter schemas, and examples. Tool design is prompt design plus API design. A good tool interface makes the right action easy and the wrong action difficult or impossible.

Good tool descriptions explain:

- What the tool does.
- When to use it.
- When not to use it.
- Required input formats.
- What the output contains.
- Important limitations and safety concerns.

For complex tools, include `input_examples` when supported. Examples are especially helpful for nested objects, date formats, identifiers, and domain-specific enums.

### Parameter Design

Prefer parameters that match the operation's real domain model. Do not ask the model to reconstruct business invariants from a bag of strings.

Use enums for stable, closed sets:

```json
{
  "source": {
    "type": "string",
    "enum": ["knowledge_base", "billing_records", "support_tickets"],
    "description": "Which repository to search."
  }
}
```

Use lookup-then-act when users refer to entities by ambiguous names:

1. `search_projects(query)` returns project IDs and distinguishing metadata.
2. `archive_project(project_id)` acts only on an unambiguous ID.

When the lookup returns multiple candidates and the agent cannot confidently pick one, prefer presenting the candidates to the user with differentiating fields (creation date, owner, last activity, location) so the user can confirm which one is meant. A "single-click" UI selection — the user sees three candidates, picks one, and the agent proceeds with the chosen ID — is far more reliable than asking the model to guess and run a destructive operation. This pattern is complementary to preview-then-execute: disambiguation resolves *which entity* the user means, preview-then-execute confirms *what action* will happen to it.

Prefer stable identifiers over derived intermediate values. If the user already has a `device_id`, a downstream tool should usually accept `device_id` rather than requiring the agent to call a previous tool just to extract a serial number or location. Let the tool resolve mechanical dependencies internally when model judgment is not needed.

Split tools when parameters have interdependent constraints. If a workout can be cardio or strength, a single `log_workout(type, value, unit)` tool invites invalid combinations. Separate `log_cardio_session` and `log_strength_session` tools make the schema itself encode the distinction.

When one operation type has different required fields from another, use separate tools. A unified `manage_order(action, ...)` tool causes omitted parameters and irrelevant fields. Separate `issue_store_credit`, `cancel_subscription`, and `replace_damaged_item` tools give Claude a simpler choice and a cleaner schema.

### Output Design

Tool results should be structured, compact, and useful for the next decision. Include identifiers that downstream tools can use.

Weak output:

```text
Found these documents: Maintenance Schedule, Lab Access Plan, Vendor Notes.
```

Better output:

```json
{
  "results": [
    {
      "document_id": "doc_284",
      "title": "Maintenance Schedule",
      "owner": "operations",
      "updated_at": "2026-04-20"
    }
  ],
  "total_matches": 1
}
```

Normalize heterogeneous backend data before returning it to the agent. If three carriers represent shipment status differently, the tool should return a consistent schema such as `status`, `estimated_delivery`, `delay_reason`, and `requires_action`. Do not force the model to learn carrier-specific code mappings from raw payloads.

Distinguish a successful empty result from an error. "No matches found" should be a successful result with an empty `results` array, not an `isError` tool result. Otherwise the agent may retry a valid query as though the tool failed.

For paginated APIs, do not automatically fetch hundreds of items if the user may only need the first page. Return the first page, `total_count`, and a cursor or continuation token. Fetch more only if needed.

### Tool Composition

Combine operations only when doing so preserves the model's required judgment.

Good candidates for composition:

- Mechanical sequences where no decision is needed between steps.
- Latency-heavy repeated lookups that always happen together.
- Atomic operations where separate calls create race conditions (for example, "check availability and book" must be atomic when other users may grab the slot between two separate calls).

Keep steps separate when the model must inspect intermediate results before deciding. Selection, judgment, and editorial choice belong outside composite tools.

Original examples:

- A news-curation agent can use a composite `discover_and_score_articles(topic)` tool that returns candidates plus relevance scores, while leaving `add_article_to_collection(article_id)` separate because editorial selection requires judgment.
- A booking system should combine "check availability" and "reserve slot" into one atomic `find_and_book_appointment` operation when separate calls risk another user taking the slot between calls. Adding a `hold_slot` tool can work but introduces a new race window and an extra step.
- A research workflow should not combine "retrieve sources" and "write final conclusion" because the model needs to inspect the sources and preserve provenance.

When a downstream tool keeps requiring an upstream tool's output for a mechanical reason (for example, fetching the address of a property just to pass it to a neighborhood-info tool), redesign the downstream tool to accept the stable identifier directly and resolve the address internally. This eliminates the latency of an unnecessary lookup and the failure coupling when the upstream call fails.

### Pagination

External APIs often return paginated results. Auto-fetching every page is rarely the right behavior:

- It causes long latency for queries that match many results.
- It wastes tokens when the user only needs the first few items.
- It can blow context when matches are very large.

Better design: return the first page, a `total_count` (or estimate), and a cursor or continuation token. Let the agent or user request more pages only when necessary.

### Large Tool Sets and Progressive Availability

Tool selection degrades when the model must choose among too many similar tools. Empirically, accuracy drops noticeably as the tool count grows past a handful of similar options. If an agent has dozens of external connectors, API operations, or domain-specific tools, do not expose everything at once by default.

Use progressive availability:

1. Start with a small set of discovery tools, such as `search_available_connectors` or `find_relevant_operations`.
2. Return a ranked shortlist with names, descriptions, required inputs, and confidence.
3. Dynamically add the selected matching tools to the agent's available tools so it can call them on subsequent turns. Once discovered, the relevant tools persist and the agent uses them like any other tool.

This is different from a monolithic `find_and_execute` tool. Search-and-execute hides the final decision and can perform the wrong action too early. A discovery tool should narrow the choices; the agent or user should still be able to inspect the selected operation before execution when risk is meaningful.

The Claude Agent SDK supports this pattern natively through tool search and dynamic tool registration. MCP servers can also notify clients when their tool list changes, allowing connected agents to refresh their view of available tools without reconnecting.

### Output: requires_review and Decision Hints

When tool outputs include uncertainty (for example, ML extractions with confidence scores), do not just return raw confidence and ask the model to interpret it. Calibrate thresholds against a labeled validation set and return both the data and a derived `requires_review` boolean with reasons:

```json
{
  "fields": {
    "vendor": {"value": "Acme Corp", "confidence": 0.94},
    "amount": {"value": 1280.5, "confidence": 0.62}
  },
  "requires_review": true,
  "review_reasons": ["amount_below_confidence_threshold"]
}
```

Raw scores invite both over-trust and over-escalation. Calibrated thresholds produce consistent agent behavior.

For confirmation flows, the tool should also return enough structured detail that the user can see what they are confirming: cost, target, schedule, irreversible effects, scope, and anything else needed to catch a mistake. A "Ready to post. Confirm?" prompt with no details is unsafe even when users always click yes.

### Safety and Confirmation

Prompt instructions are not enough for destructive actions. If an operation must always be previewed before execution, do not use `dry_run: boolean` on a single tool. The model can call the tool with `dry_run: false`.

Use a structural pattern:

1. `preview_delete_workspace(workspace_id)` returns the impact and a one-time confirmation token.
2. The user reviews the impact.
3. `execute_delete_workspace(workspace_id, confirmation_token)` requires the token and verifies it matches the previewed action.

Confirmation content must be meaningful. A prompt that says "Confirm?" is weak. Show the target account, irreversible effects, cost, schedule, destination, and anything a user would need to catch a mistake.

For ambiguous destructive operations, first resolve the target. If a CRM contains several similarly named contacts, show the candidates with differentiating fields and require the user to choose the intended record.

### Common Pitfalls

> [!WARNING]
> **Encoding format hints in parameter names.** Use descriptions and schemas, not names like `date_string_iso_yyyy_mm_dd`. Making everything a free-text string increases ambiguity and invalid combinations.

> [!WARNING]
> **Returning only human-readable prose.** Downstream tools need IDs and structured fields. Combining decision points: composite tools are good for mechanical work, not for hiding choices from the model.

> [!WARNING]
> **Assuming annotations or descriptions enforce security.** Security belongs in code, hooks, permissions, and tool logic.

---

## 3. Error Handling in Agent Tools

### What to Know

Tool errors shape agent behavior. A generic failure message forces the model to guess whether it should retry, ask the user, escalate, or stop. Production tools should classify failures and return enough context for the agent to respond appropriately.

Use these categories:

| Category | Example | Correct Handling |
|---|---|---|
| Transient infrastructure | Timeout, 503, connection reset | Retry inside the tool with backoff when safe |
| Permanent validation | Bad date, invalid enum, malformed ID | Return structured details so the agent can correct or ask |
| Business rule | Not eligible, duplicate, insufficient balance | Return non-retryable error with user-facing explanation |
| Permission | Authenticated user lacks access | Return non-retryable error and escalation/permission path |
| Uncertain write state | Timeout after submitting payment or notification | Report uncertainty and avoid automatic retry |

The tool should absorb recoverable infrastructure noise when it can. If a read-only API times out and immediate retries usually succeed, retry inside the tool. The model does not need to see the first failed network attempt.

Do not retry blindly when an operation may have already caused a side effect. If a payment, notification, order, or posting request times out after submission, the tool may not know whether it succeeded. Return a structured uncertain-state result and tell the agent not to retry without an idempotency key or explicit user decision.

### Structured Error Results

Return application-level errors as normal tool results, not uncaught exceptions. In MCP, tool execution errors use `isError: true`; protocol-level failures use JSON-RPC errors.

Example application-level error:

```json
{
  "isError": true,
  "content": [
    {
      "type": "text",
      "text": "{\"error_category\":\"business_rule\",\"retryable\":false,\"code\":\"warranty_window_closed\",\"customer_explanation\":\"This device is outside the standard warranty window.\",\"next_steps\":[\"offer_paid_repair\",\"escalate_for_exception_review\"]}"
    }
  ]
}
```

A cleaner internal representation might be:

```json
{
  "success": false,
  "error_category": "validation",
  "retryable": false,
  "field": "shipping_postal_code",
  "message": "Postal code must be 5 digits for US addresses.",
  "user_repair": "Ask the user to confirm the postal code."
}
```

### MCP Error Tiers

MCP tools have two error mechanisms:

- **Protocol errors**: the request could not be processed as a protocol operation. Examples: unknown tool, malformed JSON-RPC request, invalid arguments at the protocol boundary (such as a missing required parameter that the schema declares mandatory), unsupported method.
- **Tool execution errors**: the tool was invoked, but the underlying operation failed. Examples: upstream API returned 404 because the requested record does not exist, upstream API returned 503 because the service is temporarily unavailable, business rule violation, permission denial, rate limit.

Concrete example. An `check_availability(user_email)` tool faces three errors:

1. Caller omits `user_email` entirely, violating the tool's input schema. This is a **protocol error** (JSON-RPC error) — the call was not even structurally well-formed.
2. The calendar API returns 404 because the user does not exist. The tool was invoked correctly, the operation simply failed. **Tool execution error** with `isError: true`.
3. The calendar API returns 503 because the service is down. Again, the tool was invoked correctly. **Tool execution error** with `isError: true`.

Do not turn ordinary business failures into protocol failures. A missing record in the backend is not a JSON-RPC protocol failure; it is a tool execution result with `isError: true`.

### Retry Responsibility

Place retry logic where the needed information lives.

- Tool-level retry is right for transient backend failures where the same request should succeed (timeout, 503, connection reset on a read).
- Model-level retry is right when the model needs to change inputs or strategy (validation errors, syntax errors in user-provided filters, wrong identifier).
- Human approval is needed when retrying may duplicate a side effect or violate a policy.

A common production pattern: a `search_catalog` tool has 12% failures, split between transient timeouts (~8%, succeed on retry) and syntax errors in user filters (~4%, never succeed). Returning both identically wastes turns retrying syntax errors and tells users to "try again later" for timeouts. Correct design: retry transient errors inside the tool with backoff and surface only the final success or failure; surface syntax errors immediately with parameter validation details so the model can correct them or ask the user.

A `retryable: true|false` boolean alone is not as effective as actually retrying transient failures inside the tool, because it still costs a model turn and risks the agent retrying anyway.

### Uncertain Side Effects

Writes deserve special care. If a `send_notification`, `process_payment`, or `post_content` request times out **after** submission, the tool may not know whether the side effect occurred. Returning a generic error encourages automatic retry — and that creates duplicate notifications, double charges, or duplicate posts.

The right behavior:

- Mark the result as an error, but communicate uncertainty in the message: "Timeout — delivery status unknown. Message may have been sent. Avoid retry without idempotency check."
- Do not flag it as `retry_safe: true`.
- Encourage the agent to verify with a separate status lookup, or to confirm with the user before acting.

This is the inverse of read-side timeouts where retrying is usually safe.

### Common Pitfalls

> [!WARNING]
> **Throwing exceptions for expected business errors.** Frameworks often hide exception details from the model.

> [!WARNING]
> **Marking uncertain side effects as retryable.** This causes duplicate charges, messages, or postings.

> [!WARNING]
> **Returning empty data for backend failures.** An empty list means "success with no matches," not "the API failed." Making the model parse free-text errors: give it structured fields.

---

## 4. Structured Data Extraction and Validation

### What to Know

Structured extraction is a first-class architecture problem. The goal is not merely valid JSON. The goal is data that is syntactically valid, semantically correct, traceable to the source, and safe for downstream systems.

Use schema-backed output for extraction. On current Claude APIs, that may mean `output_config.format` JSON structured outputs for direct JSON responses, or tool use/strict tool use when the extraction is represented as a tool call. Prompt-only JSON can work for low-risk prototypes, but it is not the best choice for production pipelines that feed databases, workflow engines, or audits.

### Schema Design

Schema constraints help shape the output, but they do not prove that the source supports the value. A schema can verify that `attendee_count` is an integer; it cannot verify that the article actually stated an attendee count.

Use optional or nullable fields for information that may be absent. If a field is required even when the source may not contain it, the model is pressured to fabricate. Teach the extractor to return `null`, an empty array, or an explicit absence reason when information is not stated.

Choose absence semantics deliberately:

| Situation | Schema Pattern |
|---|---|
| Field may not appear in source | Optional field or nullable value |
| List may be explicitly empty | Empty array allowed |
| List item unknown but field exists | Item with `value: null` and `reason` |
| Ambiguous classification | Add enum value such as `unclear` |
| Open-ended category set | Enum plus `other_detail`, or string plus normalization |

Closed enums are good when the domain is stable. If new categories appear constantly, a strict enum without escape hatch creates validation failures. A common design is:

```json
{
  "equipment_type": {
    "type": "string",
    "enum": ["laptop", "monitor", "printer", "network_device", "other"]
  },
  "equipment_type_detail": {
    "type": ["string", "null"],
    "description": "Original source wording when equipment_type is other."
  }
}
```

### Reducing Fabrication

Use instructions and examples that distinguish extraction from inference:

- "Extract only values stated in the source."
- "Use `null` when the source does not provide the information."
- "Do not infer missing values from typical examples."
- "Preserve informal measurements verbatim when no precise value is given."

Schema design also affects fabrication. If a field is required but the source rarely contains the information, the model is structurally pressured to invent values. Make these fields optional or nullable.

A common alternative — running a second LLM call to "verify" extracted values against the source — is generally inferior to fixing the schema. Verification calls add cost and latency, can themselves hallucinate or rationalize the original answer, and do not address the root cause: the model produced a value because the schema demanded one. Allowing `null` (or `unclear`, or `not_stated`) lets the first call signal absence directly, which is both cheaper and more honest. Use a verification pass only as a sampling-based audit on already-good extractions, not as a fix for fabrication caused by overly strict schemas.

Allow `null` rather than empty arrays when the distinction matters semantically. An empty `pros` array often reads as "the reviewer mentioned no pros," which is a real claim. `null` reads as "the document did not address pros," which is closer to the truth for very short reviews. Similarly, an enum like `["positive", "negative", "mixed"]` should grow an `unclear` value when sarcasm or ambiguity is common, so the model has a correct option instead of being forced to pick.

Few-shot examples are especially effective when the model is inconsistent across varied document structures. Show complete input-output pairs for edge cases: missing data, ambiguous sentiment, informal units, compound skills, multiple values, amendments, and values buried in nonstandard sections. They are also more effective than verbose written rules at teaching subtle distinctions: when standardized formats matter (for example, "cotton blend" vs "Cotton/Polyester mix"), 2–3 input/output examples teach the format more reliably than narrative instructions.

A specific failure pattern: a strict enum without escape hatch fails when new categories keep appearing. Add an `other` enum value with a paired `*_detail` string field for the source's actual wording. This handles long-tail categories without rewriting the schema each time a new category appears.

### Source Grounding and Provenance

For high-stakes extraction, include provenance fields:

```json
{
  "field": "termination_notice_days",
  "value": 45,
  "source_location": "Amendment 2, section 4",
  "source_quote": "The notice period is amended to forty-five days.",
  "effective_date": "2026-01-01"
}
```

This is critical when:

- Source documents contain amendments.
- Multiple sections contain conflicting values.
- Final reports need citations.
- Human reviewers must audit the model's choices.

API-level citation features can help for narrative answers over documents, but strict JSON structured outputs and citations may be incompatible because citations require interleaved citation blocks while JSON schemas require constrained JSON. When you need structured extraction plus provenance, represent source locations explicitly in your schema instead of assuming the citation feature can be attached to every JSON field.

For documents with amendments, a single scalar field may be the wrong schema. Capture original and amended values with effective dates and locations. For documents with a known precedence rule, such as "use the detailed specifications table over marketing summary text," include that rule in the extraction instructions and keep the schema simple.

### Semantic Validation

JSON Schema, structured outputs, strict tool use, and Pydantic catch type, presence, enum, and shape errors. They do not catch every semantic error. Add domain validation:

- Line items sum to totals.
- Dates fall within allowed ranges.
- IDs match known formats or known records.
- Required citations exist in the source.
- Fields are not copied into the wrong category (a duration is not an ingredient quantity, a competitor's specs are not the product's specs).

When validation fails, do not blindly retry the same request. Send a correction request that includes the source document, the previous extraction, and the exact validation errors. This is much more effective than asking the model to "try again" — and far more effective than setting `temperature: 0`, which only removes variability without addressing the underlying mismatch.

Example correction prompt structure:

```text
The extraction below failed validation.

Validation errors:
- line_items_total does not equal stated_total
- vendor_id does not match the expected pattern

Return a corrected call to extract_invoice. Do not change fields unless needed to fix the errors.
```

For fields prone to internal inconsistency (such as line items vs grand total on invoices), add explicit reconciliation fields to your schema:

```json
{
  "line_items": [],
  "calculated_total": 1280.5,
  "stated_total": 1295.0,
  "totals_match": false
}
```

Then flag mismatches automatically. This catches both OCR errors and extraction mistakes without forcing the model to reconcile values it cannot verify.

#### When Retries Don't Help

Some failures cannot be fixed by retrying with the same input:

- The information is in an external document that was not provided to the model. Retries will only produce hallucinated values.
- The schema requires a different format than the source provides (for example, the schema requires a flat array of strings but the source organizes the data as a nested object). The model can usually fix this on retry with feedback.
- A locale-formatted number ("1,234") needs to become an integer (1234). Easily fixed on retry.
- A date is given as ISO 8601 datetime but the schema requires only the date portion. Easily fixed on retry.

The first case is the only one where additional retries are unproductive. Retrieve the missing source or route to human review instead.

### Long and Scattered Documents

Long documents can fit in the context window and still be hard to extract from when facts are scattered, repeated, or revised over time. Accuracy often improves when you split the task into stages:

1. Identify and summarize the relevant sections, decisions, tables, or events.
2. Extract structured data from that focused intermediate representation.
3. Preserve source locations so the extraction can be audited against the original.

Use chunking when documents exceed context limits or when independent sections can be processed separately. Use a pre-extraction summarization or mapping step when the document fits but the key facts are distributed across a meandering transcript, long contract, or multi-section report. Chunking alone can lose cross-section relationships; summarization alone can lose exact values. Choose based on the failure mode.

For long-but-in-context inputs (a sprawling meeting transcript, a long support thread, an unstructured incident report) where the source fits but key facts are buried among unrelated content, a model-driven pre-extraction pass usually outperforms both raw extraction with more few-shot examples and mechanical chunking. Add a first call that asks the model to surface the relevant sections — decisions, action items, named entities, dollar amounts, dates — into a structured intermediate. Then run extraction against that intermediate. The intermediate keeps the model focused on the parts that matter and substantially reduces the rate at which scattered details are missed or conflated. Few-shot examples help when extraction patterns are unusual; they do not by themselves help the model find a needle in a haystack. Chunking spreads the haystack across requests but loses cross-chunk relationships. Pre-extraction summarization preserves both.

### Confidence and Human Review

Self-reported confidence is useful only after calibration. Do not assume `confidence: 0.92` means 92% accuracy. Build a labeled validation set and measure accuracy by document type, field, source quality, and confidence band.

Better than a raw confidence score alone:

```json
{
  "amount_due": {
    "value": 1280.5,
    "confidence": 0.88,
    "requires_review": true,
    "review_reasons": ["total_mismatch", "low_ocr_quality"]
  }
}
```

Route human review based on:

- Low calibrated confidence.
- Ambiguous or contradictory source content.
- High-impact fields.
- Failed semantic validation.
- New or historically error-prone document types.

#### Validating Automation Plans

Before automating high-confidence extractions, do not just verify aggregate accuracy. A pipeline that is 97% accurate overall can still be 80% accurate on a specific document type or field. Break down accuracy by segment (document type, field, source) before raising the automation threshold. Lowering the threshold or comparing thresholds before that segment-level analysis is premature.

Even after automation begins, sample high-confidence outputs continuously. Use stratified random review of a fixed percentage to detect hidden error patterns and measure whether improvements actually reduce error rates. Lowering the threshold or relying only on downstream complaints misses systematic errors that look reasonable to humans not reading the source.

### Feedback Loops

Human corrections should feed prompt and schema improvements. Look for recurring patterns:

- Informal units being converted incorrectly.
- Compound phrases split inconsistently.
- Missing fields in nonstandard sections.
- False positives in code review findings.
- Repeated validation failures by field.

When you observe a clear recurring failure mode (for example, "informal measurements like 'a handful' or 'a splash' get either invented or omitted in 23% of corrections"), the highest-leverage change is usually adding a few-shot example demonstrating the correct handling — extracting the informal phrase verbatim. Fine-tuning, regex post-processing, or new schema fields are heavier interventions that can be considered only if focused prompt/schema improvements do not move the metric.

For dismissed code-review findings, add fields like `detected_pattern`, `rule_id`, or `evidence` so analysts can see *what kind of code construct* triggered each finding. Aggregate dismiss rates by pattern, then update the prompt criteria for the over-reporting patterns. Without that field, you can only see "35% are dismissed," not which constructs to suppress.

### Batch Extraction

For high-volume asynchronous extraction, the Message Batches API can reduce cost but adds latency. Use it when the workflow tolerates delayed results. Use real-time Messages API for urgent documents, interactive user flows, or SLA-sensitive alerts.

Batch requests have `custom_id` values. Results may not arrive in the same order as requests, so always join results by `custom_id`. If a small percentage fail due to context length or validation errors, resubmit only the failed documents after fixing the cause, such as chunking long inputs or improving the prompt.

For mixed urgency, route per-document, not per-batch. Standard documents go to the Batch API for cost savings; urgent ones go to the real-time Messages API to meet tight latency SLAs. Trying to batch everything and then expedite urgent documents inside the batch defeats the purpose — batch processing latency is the main reason urgent items cannot use it.

For one-shot bulk extraction with a deadline (for example, 50,000 documents under a two-week deadline where a meaningful percentage will need prompt iteration), submit everything to the Batch API for the bulk discount, then submit the failures in successive batches with refined prompts. Sequencing 10 sequential batches of 5,000 each costs more in calendar time and does not buy meaningful learning. Sampling first via real-time API can help characterize failure modes, but it is a small slice of the overall workload, not the main strategy.

### Common Pitfalls

> [!WARNING]
> **Treating valid JSON as correct data.** Syntax validation is only the first layer. Confusing schema compliance with source truth: a constrained decoder can guarantee shape, not that the source supports the value.

> [!WARNING]
> **Making absent source fields required.** This encourages hallucination. Using strict enums without escape hatches in evolving domains: add `other` plus detail or normalize later.

> [!WARNING]
> **Relying only on aggregate accuracy.** Accuracy can hide poor performance for specific fields or document types. Sending all long documents through one extraction call: chunk, summarize first, or use staged extraction when information is scattered.

---

## 5. Conversation Context Management

### What to Know

Context management is state management. The model sees a request, not your database. You decide what to include.

The right context strategy depends on what must be preserved:

| Need | Best Strategy |
|---|---|
| Recent conversational flow | Keep recent turns verbatim |
| Long-term narrative continuity | Progressive summaries with decisions and themes |
| Current user preferences | Structured state object |
| Exact facts and numbers | Retrieval from source or structured fact store |
| Persistent creative canon | Compact "bible" or reference section |
| Tool-heavy workflows | Extract relevant fields and discard verbose payloads |

### Sliding Window

A sliding window keeps the most recent messages and drops older ones. It is simple and cheap. It works when older context is rarely needed. It fails when users refer back to earlier decisions, preferences, or exact data.

Use sliding windows when production logs show older messages are rarely referenced — for example, when 94% of user messages only reference the previous 3-5 exchanges and the remaining 6% ask about information users could easily re-state. In that traffic profile, a sliding window keeping the last 8-10 turns plus the system prompt restores response speed and quality. When users do reach back, the assistant can ask them to re-state the relevant information.

Sliding windows are also the right tool for **accumulated RAG results**. If RAG retrievals from many earlier queries pile up alongside the conversation, they crowd out turn-by-turn coherence. Apply a sliding window specifically to RAG results (keep the last 2-3 retrievals) while preserving conversation history under its own policy. Aggressive deduplication or summarizing all RAG into one digest is more complicated and rarely better.

### Progressive Summarization

Progressive summarization replaces older conversation blocks with a running summary while keeping recent turns verbatim. A useful summary is structured:

```text
Decisions:
- The user selected option B because it preserves existing integrations.

Current preferences:
- Budget target: $8,000.
- Avoid vendor lock-in.

Open questions:
- Confirm whether the migration must support offline mode.

Important facts:
- Existing system processes about 40K records per day.
```

Bad summaries are vague narratives. They lose the exact facts that users later ask about. When information matters specifically — themes of past discussions, narrative continuity across many sessions, the group's prior conclusions — summaries should explicitly extract decisions, conclusions, and recurring themes rather than producing prose that "describes the conversation."

Use a hybrid approach for ongoing conversations: replace older turns with structured summaries, keep the most recent turns verbatim. Increasing the sliding window from 25 to 50 turns is rarely the right answer; it just defers the limit. Hybrid summarization preserves long-term continuity at much lower token cost.

### Persistent Reference Sections

Some content must remain exact and stable across the whole conversation, even when the surrounding discussion is ephemeral. Examples:

- Story bibles: character backgrounds, plot structure, world rules.
- User-defined terms: "room temperature butter means 68°F in this kitchen."
- Critical safety info: allergies, medication interactions.
- Active scaling parameters: "scale all recipes to 8 servings."

Separate these into a retained reference section at the start of context. Apply trimming or summarization only to the surrounding discussion. Mixing the two and applying a single summarization pass risks losing the exact details the user expects to remain consistent.

For dinner-party-style sessions where the conversation includes both critical structured data (allergies, serving counts, definitions) and general back-and-forth (timing, presentation), the right strategy combines several techniques: extract critical data into a compact reference section, summarize general discussion, and retain recent exchanges verbatim. A pure sliding window loses the allergies; a single summary blurs the exact serving count.

### Structured State

When users revise preferences mid-conversation, maintain a canonical state object that represents current truth:

```json
{
  "workspace_search": {
    "monthly_budget_max": 4200,
    "space_type": "private_office",
    "must_have": ["bike storage", "after-hours access"],
    "no_longer_relevant": ["shared desk"]
  }
}
```

Update the object whenever the user changes a preference. Include it in each request. This is more reliable than:

- Expecting the model to infer current truth from a long conversation containing old and new values.
- Adding system prompt instructions like "always prioritize the most recently stated preferences." The model usually does, but not reliably enough.
- Pruning old turns. Pruning may remove important context for other reasons.
- Few-shot examples of "the assistant correctly applies preference changes." These help framing but do not give the model a single source of truth.

When preferences conflict, do not silently pick one if the decision matters. A user who says "I have very low risk tolerance" and later says "I want to maximize my returns like my friends did with crypto" has stated incompatible goals. The right behavior is to surface the contradiction and ask which priority should govern. A balanced compromise risks recommending something that fits neither stated preference.

The same principle applies to multi-issue customer sessions. If a customer raises three separate issues across 45 turns (a refund, a subscription question, a payment update), structured state can track each issue's current status — order ID, amounts, resolution state — independently of the linear conversation, so the agent can reliably answer "what happened with my refund?" later in the session.

### Retrieval and Fact Stores

Summaries lose precision. If users need exact p-values, source quotes, clauses, measurements, transaction IDs, or numeric thresholds, store facts in a structured database or retrieve the relevant source passage when needed.

For research assistants, combine:

- Summaries for the interpretive discussion.
- Source retrieval for exact claims.
- Structured fact tables for recurring numerical lookups.

A common pattern: a research assistant summarizes paper discussions after 8 turns to control context, but then users ask follow-up questions requiring precise numerical details (sample sizes, p-values, inclusion criteria) that the summaries blurred. Two design responses both work, but the most direct fix is to **re-inject relevant source sections on demand** when a user's question signals they need precision. A separate structured fact store of every numerical detail is heavier and may not match the variety of follow-ups; "higher fidelity summaries" that preserve all numbers tend to balloon back into the original document. On-demand retrieval scales better.

### Tool Result Compression

Verbose tool results can crowd out useful conversation. After a tool result has been processed, extract the fields that matter and drop the rest.

Example: after retrieving order details, keep `order_id`, `purchase_date`, `items`, `return_window`, `payment_status`, and `resolution_state`; discard internal backend fields, unrelated shipping events, and duplicated metadata. If a `lookup_order` tool returns 40+ fields and the agent has called it multiple times for an investigation into return requests, those tool outputs can come to dominate context. Compressing each prior order response to its return-relevant fields, then making additional lookups, is more reliable than continuing to accumulate raw responses, summarizing them all into prose, or moving them to a vector database for retrieval.

### Returning Users and Stale Data

Tool results age. A user returning hours later should not be served from stale tool outputs embedded in an old transcript. Start with a structured summary of prior interaction, then fetch fresh state before making claims about current status.

Good returning-session summary:

```json
{
  "user_issue": "billing adjustment requested",
  "prior_actions": ["validated identity", "opened case"],
  "known_ids": ["case_9138", "invoice_2044"],
  "last_known_status": "pending as of 2026-04-28T15:30:00Z",
  "fresh_lookup_required": true
}
```

Why not just resume the old session and add an instruction telling the agent to "prefer the most recent tool results"? Because the agent often references old tool results regardless of instructions, especially when the older results are more detailed than the newer ones. Filtering tool_result messages from the resumed history risks confusing the model about why earlier turns reference data it cannot see. Configuring the agent to re-call all previous tools at session start wastes calls on tools whose results may not be relevant to the new question. Starting fresh with a structured summary plus targeted fresh lookups is the most reliable pattern.

### External Updates During a Conversation

When an external system receives new information during an active chat, include the fresh state in the next model request. Depending on your architecture, this may be a system/application context block, an injected state section, or a prefix attached to the next user turn. The important principles:

- Do not expect Claude to know about events outside the request.
- Do not generate unsolicited assistant messages unless the product intentionally supports proactive notifications.
- Make current state clearly more authoritative than stale prior tool results.

### System Prompt Versioning

If you change a system prompt for users with ongoing multi-session conversations, old context may conflict with new behavior. Version system prompts and associate each conversation with the version it started under, or use a deliberate migration strategy. Applying a new persona or policy midstream can cause contradictions.

### Common Pitfalls

> [!WARNING]
> **Confusing context capacity with attention.** A 200K window does not mean every detail is equally salient.

> [!WARNING]
> **Summarizing exact facts into vague prose.** Use structured facts or retrieval when precision matters. Keeping every RAG result forever: use a sliding window for retrieved context unless earlier results remain relevant.

> [!WARNING]
> **Resuming old transcripts with stale tool results.** Summaries plus fresh lookups are safer.

---

## 6. System Prompt Engineering and Conversational Behavior

### What to Know

The system prompt defines role, tone, constraints, and priorities. It should be included in every request. It is not a one-time initialization message.

A common confusion is "the system prompt is sent only on the first turn and Claude remembers it." That model is wrong. Claude has no memory between API calls. The system prompt and the full message history must be sent on every request. If your application omits the system prompt on later turns, behavior will diverge from the configured persona immediately, not gradually. Likewise, prior assistant and user messages must be sent in the `messages` array, even when their content seems redundant — the model has no other way to see them.

A separate effect is real, however: even when the system prompt is included on every call, **attention to it weakens as the conversation grows.** This is not because the prompt is "dropped." It is because the model's recent assistant outputs and the latest user turns increasingly compete for attention with the system prompt. After many turns, behavior can drift even though the system prompt is unchanged and the context window is not full. The fix is structural — reinforce key instructions at natural breakpoints, version the prompt for long-lived sessions, and move hard requirements into code or tool implementations.

Good system prompts use clear sections:

```xml
<role>
You are a careful financial education assistant.
</role>

<style>
Use plain language for beginners. Match the user's demonstrated sophistication.
</style>

<safety>
If the user asks for personalized investment, legal, or medical decisions, explain limits and recommend a qualified professional where appropriate.
</safety>

<examples>
...
</examples>
```

XML-style tags are not magic, but they improve salience and organization. They are particularly helpful when the same word means different things in different contexts (a `<role>` block clearly separates persona from a `<style>` block, even if both reference "tone"), and when you want examples or constraints to be referenceable later in the conversation ("apply the rule from `<safety>`").

When external systems update state mid-session — for example, a webhook reports that an order has shipped, or a billing event flips a customer's plan — the right place to surface that change is the system prompt for the next call, not buried inside a tool result. The system prompt is the natural home for "what is currently true about this user, account, or environment." Tool results are appropriate when the agent itself called for the information; system-prompt updates are appropriate when state changed without the agent asking.

### Principles vs Conditionals

Use general principles for judgment-heavy behavior:

- "Adapt explanation depth to the user's demonstrated expertise."
- "Prefer one clarifying question at a time."
- "State reasonable assumptions when moving forward under ambiguity."

Use explicit conditionals for safety-critical triggers:

- "If the user describes an immediate medical emergency, direct them to emergency services."
- "If the request requires a regulated financial decision, do not provide personalized advice."

If a rule must hold 100% of the time, move it out of the prompt and into code.

A common over-correction is to translate every nuanced behavior into an explicit conditional. This rarely improves behavior and often hurts it. Consider an assistant that should adapt explanation depth to demonstrated user expertise. A general principle ("Adapt depth to the user's demonstrated proficiency, increasing detail when their questions show domain familiarity") lets the model integrate dozens of implicit signals — vocabulary, framing, follow-up specificity, the level of error in their guesses. A long list of conditionals ("If user mentions X, assume novice; if user uses term Y, assume intermediate…") forces the model into a shallow keyword match and tends to misclassify users who phrase things atypically. Use principles for judgment; reserve conditionals for safety triggers and policy bright lines.

### Few-Shot Examples

Examples often outperform long prose instructions. Use examples when you need the model to learn distinctions:

- Beginner vs expert explanations.
- Acceptable vs reportable code review findings.
- Correct extraction from unusual document layouts.
- Good vs bad clarifying-question behavior.
- Handling missing information without fabrication.

Keep examples realistic and compact. Show the exact behavior you want.

When a system prompt has grown into long bulleted rule lists, behavior often drifts because the model cannot keep all rules salient at once. Replacing chunks of those rules with two or three contrasting examples typically restores adherence: rather than telling the model in seven sentences how to summarize a beginner's question vs an expert's question, show it both. Examples are denser than prose for behavior the model needs to learn rather than recite.

### Prompt Dilution

System prompt adherence can weaken as conversation grows, even before the context window is full. The assistant's previous responses become a behavioral pattern. Mitigations:

- Use concise, well-structured system prompts.
- Put critical instructions in salient sections.
- Include behavioral examples.
- Add natural reminders before complex tasks.
- Validate or enforce important rules outside the model.

For long-running workflows, reinforcement can be inserted as application state or user-role reminders at natural breakpoints. Avoid cluttering every turn with giant repeated instructions.

Concretely, two reinforcement patterns work well:

- **User-role reminders at natural breakpoints.** When a session crosses a phase change — finishing one task and starting another, returning after a long idle period, switching topics — append a brief user-role message that re-states the current operating constraints. This is more effective than re-sending the entire system prompt because it integrates with the conversational flow the model is already attending to.
- **System prompt versioning across long sessions.** For multi-day or multi-session conversations, allow the application to update the system prompt between turns to reflect what is now true (the user's current plan, latest decisions, completed steps). Treat the system prompt as living configuration, not a static initialization string. The full conversation messages still go in `messages`; the system prompt carries "what currently holds" rather than "what was true on day one."

### Clarifying Questions and Assumptions

Asking too many clarifying questions increases friction. The right behavior depends on risk.

Ask a clarifying question when:

- Multiple interpretations lead to substantially different actions.
- The action is irreversible or costly.
- The user has expressed conflicting goals.
- Required information is truly missing.

Proceed with stated assumptions when:

- The action is low risk.
- Context strongly suggests the likely intent.
- The user can easily correct the direction.

Good pattern:

```text
I'll assume you want the report edited for clarity rather than rebuilt from scratch. I'll focus on structure and wording first, and you can redirect me if you meant formatting or data analysis.
```

For genuinely ambiguous requests, prefer **one focused clarifying question** over a list of three or four. Multiple simultaneous questions feel like an interrogation and frequently cause users to answer only the first. Pick the disambiguation that most changes your next action.

Front-loading many clarifying questions before any action is also typically wrong. The cost of a small redirected effort is usually lower than the friction of long preflight Q&A. The exception is when the action is irreversible, costly, or touches a regulated domain — there, ask first and proceed only after explicit confirmation.

When user preferences conflict, do not average them into a vague compromise. Name the tension and ask which priority should govern. For example, if a user wants both "the cheapest possible flight" and "arriving by 9 AM Friday with no layovers," surface the contradiction explicitly: a cheap nonstop arriving by Friday morning may not exist on this route, so which constraint should bend? Hidden compromises produce results that satisfy neither stated goal and usually require rework.

### Response Format Control

If responses become repetitive, do not only add "never say X" lists. Better options include:

- Better examples in the system prompt.
- A concise style guide.
- Partial assistant prefill for specific API calls.
- Post-processing for purely cosmetic cleanup when safe.

Partial assistant prefill is particularly effective for repetitive openers. If every reply starts with "Great question!" or "I'd be happy to help," prefilling a more neutral first sentence (or a constrained format like a checklist marker) skips the boilerplate without expanding the system prompt. Keep the prefill short — one phrase, not a paragraph — and avoid prefilling content the model needs to reason about.

For strict machine-readable output, prefer structured outputs or tool use over text formatting instructions.

### Common Pitfalls

> [!WARNING]
> **Using "IMPORTANT" and "NEVER" as reliability mechanisms.** They help salience but do not guarantee behavior.

> [!WARNING]
> **Adding endless conditionals.** This bloats the prompt and can reduce adherence. Hiding key rules in long prose: use sections and examples.

> [!WARNING]
> **Putting workflow-specific checklists in global memory.** Use slash commands or task-specific prompts when the checklist applies only sometimes.

---

## 7. Model Context Protocol (MCP)

### What to Know

MCP is an open standard for connecting AI applications to external systems. An MCP server exposes capabilities; MCP clients connect to servers; the host application decides how users and models interact with those capabilities.

MCP provides three important server-side building blocks:

| MCP Feature | Who Controls It | Purpose |
|---|---|---|
| Tools | Model-controlled | Actions and computations the model may invoke |
| Resources | Application-controlled | Context such as files, schemas, catalogs, or documents |
| Prompts | User/application-controlled | Reusable prompt templates or workflows |

Use tools for actions: search, update, create, analyze, send, calculate.

Use resources for passive context: database schemas, documentation trees, issue summaries, file catalogs, API references. Resources reduce exploratory tool calls because the agent can see what information exists before acting.

Use prompts for reusable workflows: review checklists, report templates, investigation playbooks.

A common design question is "should this be a resource, a tool, or a separate aggregator?" The default decision rule:

- If the content is reference material the agent might want to consult before acting (database schemas, API specs, file catalogs, project guidelines, configuration), expose it as a **resource**. The agent reads it like context; no tool call is needed beyond the resource fetch.
- If the content is dynamic and requires computation or external lookup at the moment of use (the current state of an order, the result of a query against live data), expose it as a **tool**.
- If the agent is overwhelmed by similar tools across many servers, the right fix is improving descriptions and using progressive availability — not consolidating everything behind a single "natural language entry tool" that re-routes to the underlying tools. That kind of aggregator hides the real tool surface from the model and tends to produce worse selection, not better.

Resources and tools are complements, not alternatives. A well-designed MCP server typically exposes both: resources for "what is true and stable about this system" and tools for "what actions can be taken on it." Replacing resources with tools forces the agent to make a tool call to learn anything; replacing tools with resources prevents the agent from acting at all.

### Why MCP

MCP is most valuable when the integration should be reusable across multiple clients or applications. If five AI tools need the same internal ticketing data, expose it once through an MCP server. If only one agent needs a deeply application-specific workflow, a custom tool inside that application may be simpler.

MCP does not automatically solve authentication, rate limiting, retries, caching, authorization, or performance optimization. Those remain system design responsibilities.

### Tool Discovery and Selection

Tools from connected MCP servers are discovered and exposed to the model through the client/host. When multiple servers are connected, the agent typically sees a combined tool registry. Good descriptions are critical because MCP tools compete with built-in tools and other server tools.

If the agent ignores a specialized MCP tool and uses generic search or shell commands instead, the most likely fix is to improve the MCP tool description:

- Explain when the tool is preferable to generic alternatives.
- Describe inputs and outputs.
- Include examples.
- Mention key capabilities such as transitive dependency analysis, ranking, source metadata, or safe refactoring.

Do not first remove all competing tools. The agent often needs generic tools too.

### Tool Annotations and Trust

MCP tool annotations are metadata that servers may include alongside their tool definitions. The standard hints include `readOnlyHint` (the tool does not modify state), `destructiveHint` (the tool may make irreversible changes), `idempotentHint` (calling the tool twice with the same input has the same effect as calling it once), and `openWorldHint` (the tool reaches external systems whose behavior the host cannot fully predict). These hints help the host build sensible UI affordances — for example, auto-allowing read-only tools, warning on destructive ones, suppressing repeat-confirmation on idempotent ones.

**Annotations are not a security boundary.** A malicious or buggy server can advertise `readOnlyHint: true` for a tool that deletes data. The host must treat annotations as untrusted hints and base actual permission and confirmation decisions on the server's trust level, the user's policy, the tool's identity, and the operation's real risk. A typical correct policy: use annotations to choose which prompt to show, but never use them to skip a security check that policy requires.

### MCP Error Handling

MCP distinguishes two error tiers, and using the wrong one is a common bug:

- **JSON-RPC protocol errors** are returned when the request itself is invalid or the tool cannot be invoked at all: missing required parameters, unknown method, malformed JSON, parameter type mismatches. The client treats these as protocol-level failures, not as something to relay to the model as if the tool had run.
- **Tool result with `isError: true`** is returned when the tool ran but failed semantically: a remote 404, a 503 from an upstream service, a permission denial, a validation rejection from the underlying system. The model sees these as tool results and can adapt — retry, choose a different tool, or surface to the user.

A useful rule: if the failure happened before the tool's business logic could execute, return a JSON-RPC protocol error. If the tool reached its target system and that system or the operation itself failed, return a tool result with `isError: true` and a useful message. Putting a missing-parameter failure in `isError` confuses the agent into retrying with the same bad call; putting a remote 503 into a JSON-RPC error prevents the agent from trying again later.

For resources, servers should validate URIs and return appropriate JSON-RPC errors for not found or internal failures. For tools that wrap inherently flaky network calls, lean toward `isError: true` with a clear message so the agent can decide whether to retry, switch tools, or escalate.

### Tool Search and Progressive Availability

Hosts can expose dozens of MCP servers, and presenting all their tools at once would consume a large fraction of the context window before any work begins. Two coordinating mechanisms exist:

- **Tool search / progressive availability.** The host shows the agent a small surface initially and lets it pull additional tool definitions on demand based on the current task. The agent only spends tokens on tools it is about to use.
- **`list_changed` notifications.** A server can notify clients that its tool set has changed (a server connected, a feature flag flipped, a permission changed). The client refreshes its tool list and the agent can pick up the new capability without a session restart.

When designing an MCP server intended for a host with progressive availability, pay extra attention to descriptions and names: the agent may discover the tool through search, so the description must read well in isolation, not only when listed alongside its siblings.

### MCP in Claude Code

Claude Code can configure MCP servers at several scopes. The scope determines where the configuration lives, who can see it, and which copy wins when names collide:

| Scope | Storage | Visibility | Typical Use |
|---|---|---|---|
| Project | `.mcp.json` at the repository root, checked into version control | Everyone who clones the repo | Tools the whole team needs to do the project's work — internal documentation servers, project-specific test runners, build orchestration |
| Local | An entry inside `~/.claude.json` keyed to the current project path | Only the current user, only when working in that project | Sensitive credentials for personal accounts, experimental servers under evaluation, project-specific tooling not yet ready to share |
| User | A separate entry in `~/.claude.json` not tied to a project | Only the current user, in any project they work on | Personal productivity tools — calendar, email, notes, clipboard — that the user wants available everywhere |

When the same server name exists at multiple scopes, the higher-precedence configuration wins. A common convention is project > local > user, so a team-shared `.mcp.json` definition overrides a user's experimental copy of the same server name. Use project scope deliberately because it is shared. Avoid putting personal credentials in project scope — those belong in local or user scope, where they remain on the developer's machine.

A nuance worth remembering for the exam: local and user scopes both live inside `~/.claude.json`, but at different keys. They are not "the same scope with different names" — local entries are scoped to a project path, user entries are global to the user. Selecting the wrong scope for a personal tool can leak credentials into a shared repo or, conversely, hide a tool the developer expected to see in every project.

MCP prompts surface as slash commands in Claude Code. The slash-command name typically follows a `mcp__<server>__<prompt>` pattern so the user can disambiguate prompts coming from different servers. MCP output can be large; tool authors should control output size and offer pagination or summarization affordances so a single tool call does not crowd out the rest of the conversation.

### Common Pitfalls

> [!WARNING]
> **Using a tool where a resource is better.** Catalogs and schemas are often resources, not tools.

> [!WARNING]
> **Assuming MCP handles auth and retries automatically.** It is a protocol, not a complete middleware platform. Trusting self-reported annotations: trust the server and your policy controls.

> [!WARNING]
> **Writing minimal descriptions.** "Analyzes code" is not enough.

---

## 8. Agentic Patterns and Task Decomposition

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

## 9. Customer Service and Production Workflow Design

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

## 10. Claude Code and Claude Agent SDK Workflows

### What to Know

Claude Code is an agentic coding tool. The Claude Agent SDK exposes the same style of agent loop, built-in tools, hooks, sessions, subagents, permissions, and MCP integrations for programmable agents.

Current docs refer to the product library as the Claude Agent SDK. Older references may say Claude Code SDK.

### Built-in Tool Selection

| Task | Best Tool |
|---|---|
| Search file contents | Grep |
| Find files by path/name pattern | Glob |
| Read a known file | Read |
| Targeted unique edit | Edit or MultiEdit |
| Full file replacement | Read then Write |
| Run tests or shell commands | Bash |
| Delegate broad exploration | Task/subagent |

Use Grep for text inside files. Use Glob for filenames and paths. Do not use filename search to find code references inside files.

For codebase exploration, start from entry points and follow imports/calls. Do not read hundreds of files upfront. Map first, then read selectively.

Original exploration workflow:

1. Grep for route names, error codes, or function identifiers.
2. Read the matching entry files.
3. Follow imports to core abstractions.
4. Trace one or two representative execution paths.
5. Summarize findings in a scratchpad when the investigation is long.

When asking Claude Code to follow existing project patterns, provide concrete context rather than vague instructions. Use file references such as `@src/payments/repository.ts` or `@docs/testing.md` when those files are the examples the agent should imitate. Concrete examples beat generic requests like "follow our usual style."

### Plan Mode vs Direct Execution

Use direct execution for small, localized, low-risk changes where the target is clear.

Use plan mode when:

- The change spans many files.
- There are architectural choices.
- The work involves migrations or breaking changes.
- You need stakeholder approval before edits.
- You want read-only exploration before implementation.

Plan mode lets Claude read and propose a plan before touching disk. In Claude Code, `--permission-mode plan` starts in plan mode, and `Shift+Tab` can toggle modes in interactive sessions.

For urgent production bugs, start by gathering evidence: stack trace, relevant code, logs, and reproduction path. If the fix is obvious and narrow, implement directly. If the root cause reveals broad architectural impact, switch to planning before a larger change.

### Plan Mode vs Extended Thinking

These are different mechanisms and should not be conflated. Plan mode is a Claude Code session mode in which the assistant explores read-only and produces a plan before any edits, then waits for user approval. It is about *workflow control* — gating the transition from "thinking" to "doing" so the human can review the strategy.

Extended thinking is a model capability where Claude is given more internal reasoning budget before producing its output. It is about *reasoning quality* on hard problems — multi-step proofs, intricate code analysis, ambiguous requirement reconciliation — and does not by itself change whether the model takes actions or asks for approval.

Both can be used together: plan mode for review-gate the workflow, extended thinking for harder reasoning during planning or implementation. But they solve different problems. If the issue is that the agent jumps straight to edits without surfacing trade-offs, use plan mode. If the issue is that the agent gives shallow analyses on a complex problem, use extended thinking.

### Sessions

Claude Code organizes work into sessions — each session is a stored conversation transcript that can be resumed later. Several CLI flags control session behavior, and they are easy to confuse:

| Flag | Behavior | Best Use |
|---|---|---|
| `--continue` | Resumes the most recent conversation in the current directory without prompting | Returning to the latest in-progress work in a project |
| `--resume` (`-r`) | Resumes a specific saved session, opening a picker if no identifier is given | Selecting a specific historical session or an explicitly named session |
| `--session-id <UUID>` | Uses (or creates) a session with a specific UUID | Programmatic workflows that need a stable, known identifier |
| `--fork-session` | Creates a new session branched from an existing transcript | Exploring an alternative path without contaminating the original |

Use a named or specific session when returning to a known investigation. Use `--continue` only when the most recent conversation is definitely the one you want — in a directory where you've worked on multiple unrelated tasks, "the latest" can be the wrong session.

`--fork-session` is the right tool when you want to evaluate two different approaches starting from the same prior state. The original session is preserved untouched; the fork is a separate transcript whose history is a copy of the original at the fork point. This is preferable to resuming the original twice and trying to keep two diverging conversations straight, and preferable to copying-and-pasting context into a fresh session, which loses tool-call history.

If the codebase changed since the previous session:

- Resume and tell Claude exactly which files or functions changed when most prior context remains useful.
- Start fresh with a summary when the old transcript is likely stale or misleading.

Sessions persist conversation history, not filesystem state. If you need isolated file changes, use git branches or worktrees. For comparing two alternative implementations, fork the session so each approach can evolve independently *and* use a separate worktree so the file changes do not collide. Forking the session without isolating the files leaves both attempts editing the same checkout; isolating files without forking the session intermingles the conversation transcripts.

Avoid resuming the same session in multiple terminals at once. Both processes can append to the same session history, making later resumes confusing.

### Context Isolation and Self-Review

The same session that wrote code may be less critical of its own choices because its context includes the earlier reasoning. For high-stakes review, use a fresh review context, a dedicated review subagent, CI review, or a separate session with the diff and review criteria.

### Scratchpads

For long codebase exploration, write a concise scratchpad of durable findings:

- Important files.
- Data flow.
- Open questions.
- Confirmed assumptions.
- Risk areas.
- Next steps.

This helps when context compacts or when another session must pick up the work.

### CLAUDE.md and Memory

`CLAUDE.md` files store project or user memory: build commands, conventions, architecture notes, testing standards, and workflow preferences. They are auto-loaded into Claude Code's context based on a hierarchy:

- The root `CLAUDE.md` at the repository root applies to the whole project.
- Subdirectory `CLAUDE.md` files apply to work in that subtree, layered on top of the root.
- A user-level memory file applies across all projects for that user.
- Imports using `@path/to/file.md` syntax pull in additional shared content without copy-pasting; this is the right way to reuse a standards document across multiple `CLAUDE.md` files.

When multiple files are loaded, more specific files refine or override more general ones for the area they cover. The user-level memory is for personal preferences (preferred commit message style, preferred test command shortcuts) — not team-wide rules, which belong in repo-tracked `CLAUDE.md` files so all collaborators benefit.

Use `/memory` to inspect and edit loaded memory files. This is the first diagnostic step when Claude inconsistently follows project conventions: confirm the expected memory file is loaded before adding more instructions. If the rule is in a memory file that isn't being loaded for the current working directory, no amount of additional prompting will fix the behavior — the problem is the loading scope, not the rule's wording.

Prefer scoped memory:

- Root `CLAUDE.md` for repo-wide rules.
- Subdirectory `CLAUDE.md` files for area-specific conventions.
- `@imports` to reuse shared standards without duplicating content.
- Personal memory for individual preferences, not team rules.

Do not put every occasional workflow into global memory. A code-review checklist belongs in a slash command or review subagent if it is only relevant during reviews. Memory files are read on every turn — bloating them with workflow-specific content costs tokens and dilutes the parts that matter for ordinary work.

The mechanism for project memory is `CLAUDE.md` files plus `@import` references. There is no separate "rules directory with YAML frontmatter" mechanism — proposals that suggest a `.claude/rules/` folder with per-rule frontmatter for path scoping are not the standard model. Path scoping is achieved by placing `CLAUDE.md` files at the appropriate directory level so that work in that subtree picks them up; sharing across files is achieved with `@imports`. If you encounter advice to add YAML-frontmatter rule files, treat it as not how Claude Code's memory system actually loads context.

### Slash Commands

Slash commands are reusable prompts. Use them for explicit workflows that developers invoke intentionally:

- `/review` for a review checklist.
- `/release-notes` for release note formatting.
- `/migration-plan` for a standard migration analysis.

Project commands are shared with the repo; user commands are personal. MCP prompts can also appear as slash commands.

### Hooks and Permissions

Hooks run at lifecycle events. The most common ones to know are:

- **`PreToolUse`** — fires before a tool call. Can deny the call, allow it, ask the user for approval, defer (let normal permission rules decide), inject additional context the model will see, or modify the tool's input. This is the correct class of mechanism for "must always require approval" policies.
- **`PostToolUse`** — fires after a tool call. Useful for logging, formatting, secondary checks, or appending follow-up context.
- **`UserPromptSubmit`** — fires when the user submits a prompt. Can block the submission, modify it, or attach extra context.
- **`SessionStart`** — fires once when a session begins. Useful for loading project context, setting up environment variables, or running pre-flight checks.

A `PreToolUse` hook is the canonical way to enforce hard rules in Claude Code: matching tool name and parameters against an allow/deny list, requiring confirmation for destructive shell commands, blocking edits to generated files, or refusing writes outside an approved directory. Because hooks run as code in your environment, they cannot be talked around by the model — that is exactly why they are the right place for hard rules.

Examples:

- Block destructive Bash patterns unless approved.
- Prevent edits to generated files.
- Run a formatter after successful edits.
- Add environment context at session start.

Hooks execute shell commands in your environment. Treat them as code with security implications: a malicious or buggy hook can damage your system or exfiltrate data. Review hook configurations from third-party sources before enabling them, and avoid putting secrets in arguments that hook commands can log.

### Subagents

Subagents have separate context windows, focused prompts, and configurable tool access. Use them when a side task would flood the main context, when specialized behavior is reused, or when independent work can run in parallel.

Good subagent design:

- Clear single responsibility.
- Specific description so Claude knows when to use it.
- Limited tools needed for the role.
- Output contract that the coordinator can consume.

Avoid making every subagent inherit every tool. Tool restriction improves focus and security.

In Agent SDK and Claude Code configurations, delegation still requires the agent to have access to the tool or mechanism that launches subagents. If an agent describes a delegation but no subagent runs, check tool permissions and whether the subagent invocation tool is allowed.

A subagent does not inherit the parent's conversation. When the parent launches it, the subagent receives its AgentDefinition (its own system prompt, allowed tools, model selection) and the prompt string the parent constructed for that specific invocation. It does not see the parent's earlier turns, prior tool results, or any other subagent's output. This is intentional — it keeps subagent context focused — but it means the parent must restate every fact the subagent will need. Treat the prompt to a subagent like a brief to a contractor: assume nothing carries over.

Two practical consequences:

- **Don't assume the subagent "remembers" your project.** If the subagent needs the project's coding conventions, paste or reference them in the prompt. CLAUDE.md will not always be loaded into the subagent's context unless its definition does so.
- **Don't expect a "second invocation" of the same subagent to continue where the first left off.** Each call is fresh. If state needs to persist across invocations, the parent persists it (in a file, in a structured note) and re-supplies the relevant slice with each call.

### Common Pitfalls

> [!WARNING]
> **Using plan mode for tiny edits.** It adds overhead. Using direct execution for broad migrations: you lose review and architecture planning.

> [!WARNING]
> **Assuming all session resumes are safe.** Old context may reference changed code. Using a global `CLAUDE.md` for task-specific checklists: use slash commands or subagents.

> [!WARNING]
> **Relying on prompt instructions for destructive Bash approval.** Use hooks/permissions.

---

## 11. Iterative Refinement, Testing, and Evaluation

### What to Know

Claude improves fastest when feedback is concrete and executable. Instead of "handle edge cases better," provide failing inputs, expected outputs, test failures, validation errors, or code review examples.

### Effective Iteration

For coding:

1. Define behavior with tests or examples.
2. Ask for the smallest useful implementation.
3. Run tests.
4. Feed back exact failures.
5. Iterate one failure class at a time.

For uncertain requirements, ask Claude to interview the user or surface decisions before implementation. This is especially useful for caching, real-time architecture, auth changes, or data consistency requirements.

For formatting defects, fix one visible class at a time and verify. Avoid broad rewrites that introduce new regressions.

The most effective feedback is concrete enough that the model can locate the failure: a specific failing input, the expected output, the actual output, the validation error, or the failing test name with its assertion message. "It's not handling edge cases" gives the model nothing to act on; "for input X, the expected key `service_visits` is missing because the source uses 'maintenance entries' instead of 'service visits'" lets the model fix exactly that. When iterating on extraction or generation tasks, pair each failure with the specific source excerpt that triggered it and the rule that was violated.

When the same defect keeps recurring across several runs of the same prompt, treat that as a signal that the prompt or schema needs a structural change — adding a few-shot example, splitting a tool into more specific tools, or surfacing a new field — rather than a sign that the model needs another retry. Prompt-level fixes generalize; per-instance retries do not.

### Test Generation Quality

Generated tests are low value when they:

- Only assert that code does not throw.
- Duplicate existing coverage.
- Ignore project fixtures.
- Test implementation details rather than behavior.
- Miss important branches and error paths.

Document test standards in project memory or a testing guide. Include examples of valuable behavioral tests versus trivial tests. Provide fixture names and intended use.

### Code Review Agents

A useful review agent needs explicit report criteria. Tell it which findings matter: bugs, security, correctness, data loss, missing tests, incompatible API changes. Tell it what to skip: minor style preferences, local conventions already accepted, speculative performance advice.

For false positive reduction, few-shot examples are more effective than vague "be conservative" instructions. Show acceptable code patterns next to genuinely problematic ones.

If developers dismiss findings, capture why. Add fields such as `detected_pattern`, `rule_id`, or `evidence` so you can analyze what the system is over-reporting.

### Evaluation Loops

Evaluate by segment:

- Document type.
- Field.
- Prompt version.
- Model.
- Source quality.
- Confidence band.
- Reviewer correction category.

Aggregate accuracy can be misleading. A pipeline that is 97% accurate overall may fail on a specific high-impact field or document type.

### Common Pitfalls

> [!WARNING]
> **Asking for a full rewrite after a narrow failure.** Give the failing test and ask for a targeted fix.

> [!WARNING]
> **Using confidence without calibration.** Measure it against labeled data. Treating reviewer dismissals as noise: they are feedback.

> [!WARNING]
> **Adding infrastructure before improving examples and criteria.** Prompt/schema changes often solve repeated patterns.

---

## 12. Batch Processing, Cost, and Latency

### What to Know

The Message Batches API processes many Messages API requests asynchronously. Each batch is submitted as a set of independent requests; the API processes them in the background and returns results when the batch ends. Each request inside the batch supports the same general request shape as a Messages API call — model, messages, tools, system prompt — and each carries a `custom_id` chosen by the client.

The two most important properties to remember:

- **Discount.** Batch processing is offered at roughly half the cost of standard synchronous calls. The exact figure to remember is approximately 50% off the equivalent on-demand pricing.
- **Window.** A batch can take up to 24 hours to complete. In practice many batches finish much sooner, but you cannot rely on faster completion. Design SLAs around the 24-hour worst case, not the typical case.

Batching is useful when:

- Work is high volume.
- Results do not need to be immediate.
- The workflow can tolerate up to 24 hours.
- Cost reduction matters.
- Requests are independent.

Batching is a poor fit when:

- A user is waiting interactively.
- Alerts or business actions have short deadlines.
- Each step depends on the previous result.
- Humans need immediate feedback to continue.

Results may not be ordered like inputs, so `custom_id` is mandatory for reliable processing. The application matches each result back to its original request by `custom_id` — never by position. A duplicated or reused `custom_id` will make matching ambiguous; use stable, unique identifiers (often the source record's primary key) so re-running a partial batch is straightforward.

Operational details to know:

- A batch has a processing status such as in progress, canceling, or ended.
- Individual results can succeed, error, be canceled, or expire.
- Batch results are returned as JSONL and should be streamed or processed incrementally for large jobs.
- Validate your request shape with the standard Messages API before submitting a large batch — a single malformed request will not fail the batch, but it will produce a per-request error you must reconcile.
- Batch size and request count have platform limits, so large pipelines may need multiple batches.

### SLA Design

When documents arrive continuously, choose a batch cadence based on deadline minus worst-case processing window and operational buffer. The arithmetic is mechanical: a record submitted at the next batch run has to wait up to (interval until next run) + (batch processing time, up to 24 hours) + (post-processing) before its result is usable. The slowest record sets the worst case, not the average.

Example: if results must be available within 30 hours and batch processing may take up to 24 hours, leaving a 6-hour buffer for downstream work, the maximum acceptable interval between submissions is six hours. Anything longer means a record that arrives just after a submission can wait long enough that the deadline is missed. With a six-hour cadence, the worst case is a record that arrives one second after submission and must wait six hours to enter the next batch — combined with the 24-hour batch worst case, that totals 30 hours, exactly at the SLA boundary. To leave any margin at all, choose a cadence shorter than (deadline − batch window − processing buffer).

A second example: if the SLA is 36 hours and the batch worst case is 24 hours, the cadence can stretch to roughly 12 hours. If the SLA is 26 hours, the cadence must drop to 2 hours or less, because there is almost no margin. Tightening the cadence costs more API calls and orchestration overhead but is the only way to honor a tight SLA against a 24-hour batch ceiling. Submitting "once a day" is only safe when the SLA is at least 48 hours and you are willing to absorb tail latency.

### Failure Handling

Do not rerun the entire batch when a small percentage fails.

Handle by failure type:

- `context_length_exceeded`: chunk only failed inputs, then merge partial extractions.
- Validation failure: resubmit failed records with validation-error feedback.
- Prompt/schema issue: refine prompt and resubmit affected records.
- Expired/canceled: resubmit only incomplete `custom_id`s.

### Batch and Prompt Caching

Prompt caching can reduce costs for repeated context in some workflows, but it does not solve latency or context-limit failures by itself. If a request is too long, caching the prompt does not make the context window larger. If a result is needed immediately, batch discount does not matter.

### Common Pitfalls

> [!WARNING]
> **Choosing batch solely for cost.** Latency and SLA dominate.

> [!WARNING]
> **Assuming result order.** Always join by `custom_id`. Retrying all records after partial failure: resubmit only failures.

> [!WARNING]
> **Using batch for interactive refinement.** Use real-time calls when humans are waiting.

---

## 13. Quick Reference Cheat Sheet

### API and Output

- Claude is stateless. Send the context you want the model to use.
- System prompt goes in the top-level `system` parameter.
- Tool definitions and schemas consume input tokens.
- Use `output_config.format` for schema-backed JSON responses where supported.
- Use tool use or strict tool use for schema-backed tool calls.
- `tool_choice: auto` allows tools; `any` requires one; `tool` requires a named tool; `none` disables tools.
- Partial assistant prefill can control text starts, but structured outputs/tools are better for strict data.

### Tool Design

- Use clear names and 3-4 sentence descriptions for nontrivial tools.
- Include examples for complex nested inputs.
- Use lookup-then-act for ambiguous entities.
- Atomic operations for race-prone work (find_and_book together, not find then book).
- Split tools when required parameters differ by operation.
- Use progressive discovery for very large tool sets instead of exposing every tool at once.
- Return structured IDs and metadata for chaining.
- Accept stable IDs in downstream tools when intermediate lookup fields are mechanical.
- Pagination: return first page plus cursor and total_count; do not dump every record.
- Add `requires_review` and decision hints to outputs that may need human judgment.
- Empty result is success with no matches, not an error.
- Use preview-token-execute for mandatory confirmation.
- Enforce hard limits in code, not prompts; threshold values should come from server-controlled state, not model-provided parameters.

### Error Handling

- Retry transient read/infrastructure failures inside the tool when safe (network blips, 503, rate limit).
- Return validation and business errors with structured, non-retryable metadata.
- Treat write timeouts as uncertain state unless idempotency proves otherwise — the side effect may have happened.
- Distinguish "no rows found" (empty success) from "tool failed" (error) — a missing record is data, not a bug.
- MCP protocol errors are JSON-RPC errors (missing required parameter, unknown method); tool execution errors return `isError: true` (404, 503, denied).
- Repeated identical failures with the same input mean switch strategies, not retry harder.
- Do not use exceptions for expected business failures.

### Structured Extraction

- Use structured outputs or tool use with schema for reliable structured output.
- Optional/nullable fields prevent forced hallucination.
- Distinguish null (unknown / not present) from empty array (asked-and-found-none).
- Add `unclear`, `other`, or detail fields when categories are ambiguous or evolving.
- Use few-shot examples for varied document layouts and edge cases.
- Pair stated and calculated totals (e.g., `stated_total` and `calculated_total`) so reconciliation is automatic.
- Validate semantics after schema validation.
- Correct with validation-error feedback — a re-prompt that includes the source plus the validation errors fixes far more cases than a blind retry.
- Recognize when retries cannot help: if the source genuinely lacks the information, no retry will produce it.
- Use pre-extraction mapping/summarization for long documents with scattered facts.
- Add source locations for auditability.
- Capture `detected_pattern` / `rule_id` for review-agent findings so dismissals become signal.
- Calibrate confidence before automation.
- Sample high-confidence outputs to catch hidden errors.

### Context Management

- Sliding window: simple, loses older context — appropriate for forum-style or stateless help.
- Progressive summary: preserves narrative decisions and themes — appropriate for advisor/coach sessions.
- Structured state: best for current preferences and constraints — appropriate for ordering, planning, configuration.
- Persistent reference sections (story bibles, allergy lists): for facts that must remain available verbatim.
- Retrieval/fact store: best for exact numbers, clauses, and quotes pulled on demand.
- Compress verbose tool results into relevant fields — keep `lookup_order` rather than full menu rows.
- For returning users, prefer fresh start with a structured summary plus targeted fresh lookups over replaying old tool results.
- Surface conflicts between user goals; do not average them.
- Version prompts for long-lived conversations.

### System Prompts

- Send the system prompt on every request — there is no implicit memory.
- Use sections and examples.
- Principles for judgment; explicit conditionals for safety triggers.
- Move deterministic guarantees into code.
- Few-shot examples beat long abstract instructions for subtle distinctions.
- Attention to system prompt weakens with conversation length even when the prompt is included on every call.
- Reinforce critical guidelines at natural breakpoints in long sessions; version the system prompt across long-lived sessions.
- Surface contradictions in conflicting goals rather than averaging them.
- Ask one focused clarifying question for genuinely ambiguous, high-impact actions; state assumptions for low-risk ambiguity.

### MCP

- Tools are model-controlled actions.
- Resources are application-controlled context.
- Prompts are reusable workflow templates.
- MCP enables reusable integrations across clients.
- MCP does not automatically handle auth, retries, or rate limits.
- Tool annotations (`readOnlyHint`, `destructiveHint`, `idempotentHint`, `openWorldHint`) are untrusted hints, not guarantees.
- Poor descriptions cause poor tool selection.
- JSON-RPC errors for protocol-level failures (missing param, unknown method); `isError: true` tool results for execution failures (404, 503, denied).
- Project MCP config uses `.mcp.json` at the repo root; local and user Claude Code MCP config both live in `~/.claude.json` at different keys.
- Progressive availability and `list_changed` notifications keep large tool surfaces tractable.

### Agentic Patterns

- Prompt chaining: fixed steps.
- Routing: classify then dispatch.
- Orchestrator-workers: coordinator chooses subtasks.
- Dynamic decomposition: investigative work that changes as facts emerge.
- Parallel subagents: independent tasks; phase as serial decompose → parallel execute → serial synthesize.
- Subagents do not inherit parent conversation; the parent must include every needed fact in the prompt.
- The Task/Agent tool must be in the parent's `allowedTools` for delegation to work.
- Pass context explicitly to subagents.
- Preserve claim-source-date mappings in research.
- Restrict tools by subagent role.

### Claude Code / Agent SDK

- Grep searches file contents.
- Glob finds file paths.
- Read known files.
- Edit/MultiEdit for targeted changes.
- Write for full-file replacement after reading.
- Bash for commands and tests.
- Plan mode for broad or risky changes.
- Direct execution for narrow clear edits.
- `--continue` resumes most recent conversation.
- `--resume` resumes a specific session by ID/name or opens picker.
- `--session-id` uses a UUID.
- `--fork-session` branches a prior conversation; pair with a separate worktree for isolated parallel work.
- CLAUDE.md hierarchy: root, subdirectory, user-level; `@imports` reuse shared standards.
- Use scratchpads for long investigations.
- Use `/memory` to inspect loaded `CLAUDE.md`.
- Use slash commands for task-specific reusable workflows.
- Hooks: `PreToolUse` (deny/allow/ask/defer/modify-input/inject-context), `PostToolUse`, `UserPromptSubmit`, `SessionStart`.
- Subagents start fresh — they do not inherit the parent's conversation; the parent must include all needed context.

### Batch Processing

- Use Message Batches for high-volume asynchronous work.
- Avoid batch when users need immediate results.
- Roughly 50% discount versus on-demand calls; up to 24 hours per batch.
- Use `custom_id` to match unordered results.
- Resubmit only failures.
- Chunk context-length failures.
- Batch cadence ≈ deadline − 24h batch window − processing buffer; submit periodically for tight SLAs.
- Batch discount does not fix latency or context limits.

---

## Study Strategy

### Recommended Order

1. API fundamentals: stateless requests, messages, system prompt, tool-use blocks.
2. Tool design: descriptions, parameters, structured outputs, tool composition.
3. Error handling: retry categories, uncertain state, MCP error tiers.
4. Structured extraction: schemas, validation, provenance, review loops.
5. Context management: summarization, state, retrieval, stale data.
6. System prompts: salience, examples, principles, clarification.
7. MCP: tools, resources, prompts, trust, configuration.
8. Agentic patterns: decomposition, subagents, research provenance.
9. Claude Code/Agent SDK: tools, plan mode, sessions, memory, hooks.
10. Batch processing and evaluation: cost, latency, feedback, calibration.

### How to Practice

For each topic, practice choosing between two plausible designs:

- Prompt instruction vs hook.
- Enum vs free-form string plus normalization.
- Sliding window vs progressive summary.
- Tool-level retry vs model-level retry.
- Batch API vs real-time API.
- Resume old session vs start fresh with a summary.
- Single tool vs split tools.
- Raw source handoff vs structured claim-source mapping.

A strong answer explains why one design fits the scenario's constraints.

### Exam Reasoning Checklist

When faced with a scenario, identify:

1. Is the failure caused by missing context, bad tool design, bad prompt design, or missing programmatic enforcement?
2. Is the needed behavior probabilistic guidance or deterministic policy?
3. Does the model need to inspect intermediate results before acting?
4. Is the data absent, ambiguous, stale, or contradictory?
5. Is the operation interactive, asynchronous, or high volume?
6. Does a human need raw transcript, structured handoff, or source citations?
7. Are we optimizing for accuracy, cost, latency, safety, or developer workflow?

---

## Recommended Reading and Resources

### Official Anthropic Documentation

- [Messages API examples](https://docs.anthropic.com/en/api/messages-examples) — Stateless Messages API and conversation-history structure.
- [Tool use with Claude](https://docs.anthropic.com/en/docs/agents-and-tools/tool-use/overview) — Tool-use concepts, pricing/token implications, and examples.
- [Define tools](https://docs.anthropic.com/en/docs/agents-and-tools/tool-use/implement-tool-use) — Tool definitions, descriptions, schemas, and `tool_choice`.
- [Structured outputs](https://docs.anthropic.com/en/docs/build-with-claude/structured-outputs) — JSON structured outputs and strict tool use.
- [Batch processing](https://docs.anthropic.com/en/docs/build-with-claude/batch-processing) — Message Batches API, asynchronous processing, cost trade-offs.
- [Long context prompting tips](https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering/long-context-tips) — Prompt structure for long documents and retrieval-heavy tasks.
- [Citations](https://docs.anthropic.com/en/docs/build-with-claude/citations) — Source-grounded responses and citation constraints.
- [Claude Code CLI reference](https://docs.anthropic.com/en/docs/claude-code/cli-reference) — `--continue`, `--resume`, `--session-id`, output formats, and permission modes.
- [Agent SDK sessions](https://code.claude.com/docs/en/agent-sdk/sessions) — Continue, resume, fork, and session persistence behavior.
- [Claude Code common workflows](https://docs.anthropic.com/en/docs/claude-code/tutorials) — Plan mode, sessions, worktrees, subagents, and automation workflows.
- [Claude Code memory](https://docs.anthropic.com/en/docs/claude-code/memory) — `CLAUDE.md`, `/memory`, and memory scoping.
- [Claude Code slash commands](https://docs.anthropic.com/en/docs/claude-code/slash-commands) — Built-in and custom slash commands.
- [Claude Code hooks](https://docs.anthropic.com/en/docs/claude-code/hooks) — `PreToolUse`, hook outputs, and blocking behavior.
- [Claude Code MCP](https://docs.anthropic.com/en/docs/claude-code/mcp) — MCP server scopes and configuration in Claude Code.
- [Claude Agent SDK overview](https://docs.anthropic.com/en/docs/claude-code/sdk) — Programmable agents with built-in tools, hooks, sessions, MCP, and subagents.
- [Claude Code subagents](https://docs.anthropic.com/en/docs/claude-code/sub-agents) — Subagent contexts, tool limits, and configuration.

### MCP Documentation

- [MCP overview](https://modelcontextprotocol.io/docs) — What MCP is and why it exists.
- [MCP architecture overview](https://modelcontextprotocol.io/docs/learn/architecture) — Host/client/server architecture and unified tool registry.
- [MCP tools specification](https://modelcontextprotocol.io/specification/2024-11-05/server/tools) — Tool discovery, calling, and error handling.
- [MCP resources specification](https://modelcontextprotocol.io/specification/2025-06-18/server/resources) — Resources as context, URI handling, subscriptions, and resource errors.
- [MCP Inspector](https://modelcontextprotocol.io/docs/tools) — Debugging MCP servers and validating tools/resources/prompts.

### Anthropic Engineering and Courses

- [Building effective agents](https://www.anthropic.com/engineering/building-effective-agents) — Agentic workflow patterns and when to use them.
- [Claude Code best practices](https://www.anthropic.com/engineering/claude-code-best-practices) — Practical development workflow guidance.
- [Anthropic Cookbook](https://github.com/anthropics/anthropic-cookbook) — Implementation examples for tool use, extraction, and workflows.

---

## Disclaimer

This is an independent community resource. It is not affiliated with, endorsed
by, or sponsored by Anthropic. No exam questions are reproduced or paraphrased
from the official exam. Content is based on publicly available Anthropic
documentation and the official exam guide. Licensed CC BY 4.0.


## All Flashcards by Domain

### Domain 1: Agentic Architecture & Orchestration

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



### Domain 2: Tool Design & MCP Integration

**Q:** From what does an agent select which tool to use?

**A:** From the tools' names, descriptions, parameter schemas, and examples - tool design is prompt design plus API design.

_(difficulty: easy; tags: tool-design, selection)_

---

**Q:** List the things a good tool description should explain.

**A:** What the tool does, when to use it, when not to use it, required input formats, what the output contains, and important limitations and safety concerns.

_(difficulty: easy; tags: tool-description, design)_

---

**Q:** When are input_examples especially helpful in a tool definition?

**A:** For nested objects, date formats, identifiers, and domain-specific enums, where a schema alone is ambiguous.

_(difficulty: easy; tags: tool-examples, schema)_

---

**Q:** Why use an enum instead of a free-text string for a closed set like a repository source?

**A:** Enums encode stable closed sets so the model picks a valid option; free text increases ambiguity and invalid values.

_(difficulty: easy; tags: enum, parameter-design)_

---

**Q:** Describe the lookup-then-act pattern for ambiguous entity names.

**A:** First a search tool returns IDs and distinguishing metadata; then the action tool operates only on an unambiguous ID, so the model never acts on a guessed name.

_(difficulty: easy; tags: lookup-then-act, disambiguation)_

---

**Q:** A project lookup returns several candidates the agent cannot confidently choose between before a destructive op. Best design?

**A:** Present the candidates to the user with differentiating fields and let them select one; a single-click confirmation beats asking the model to guess and run a destructive operation.

_(difficulty: medium; tags: disambiguation, safety)_

---

**Q:** How does disambiguation differ from preview-then-execute?

**A:** Disambiguation resolves which entity the user means; preview-then-execute confirms what action will happen to it - they are complementary, not substitutes.

_(difficulty: hard; tags: disambiguation, preview-execute)_

---

**Q:** If the user already has a device_id, why should a downstream tool accept device_id directly?

**A:** Prefer stable identifiers over derived intermediate values; making the tool resolve mechanical dependencies internally avoids an unnecessary lookup and its failure coupling.

_(difficulty: medium; tags: stable-ids, composition)_

---

**Q:** Why split a single log_workout(type,value,unit) tool into log_cardio_session and log_strength_session?

**A:** When parameters have interdependent constraints, separate tools make the schema itself encode the distinction and prevent invalid combinations.

_(difficulty: medium; tags: tool-splitting, schema)_

---

**Q:** Why replace a unified manage_order(action,...) tool with separate operation tools?

**A:** When operations have different required fields, a unified tool causes omitted parameters and irrelevant fields; separate tools give a simpler choice and cleaner schema.

_(difficulty: medium; tags: tool-splitting, parameter-design)_

---

**Q:** What makes a tool output good for the next decision?

**A:** It is structured, compact, and includes identifiers downstream tools can use - not human-readable prose alone.

_(difficulty: easy; tags: tool-output, chaining)_

---

**Q:** Three carriers represent shipment status differently. What should the tool return?

**A:** A normalized consistent schema (e.g., status, estimated_delivery, delay_reason, requires_action) rather than forcing the model to learn carrier-specific code mappings.

_(difficulty: medium; tags: normalization, tool-output)_

---

**Q:** Should "no matches found" be returned as an isError result?

**A:** No. It is a successful result with an empty results array; marking it an error makes the agent retry a valid query as though the tool failed.

_(difficulty: medium; tags: empty-result, error-design)_

---

**Q:** How should a tool handle a paginated backend API by default?

**A:** Return the first page, a total_count (or estimate), and a cursor/continuation token; do not auto-fetch hundreds of items the user may not need.

_(difficulty: easy; tags: pagination, tool-output)_

---

**Q:** Name three good candidates for combining operations into a composite tool.

**A:** Mechanical sequences needing no intermediate decision, latency-heavy lookups that always co-occur, and atomic operations where separate calls create race conditions.

_(difficulty: medium; tags: tool-composition, atomicity)_

---

**Q:** When should steps stay separate rather than be combined into a composite tool?

**A:** When the model must inspect intermediate results before deciding; selection, judgment, and editorial choice belong outside composite tools.

_(difficulty: medium; tags: tool-composition, judgment)_

---

**Q:** Why combine check-availability and reserve-slot into one atomic find_and_book tool?

**A:** Separate calls risk another user taking the slot between them; an atomic operation prevents that race. A hold_slot tool adds a new race window and an extra step.

_(difficulty: hard; tags: atomicity, race-condition)_

---

**Q:** Why should a research workflow NOT combine retrieve-sources and write-conclusion?

**A:** The model needs to inspect the sources and preserve provenance; hiding that decision point inside a composite tool removes required judgment.

_(difficulty: hard; tags: tool-composition, provenance)_

---

**Q:** Why does auto-fetching every page of an external API usually hurt?

**A:** It causes long latency for broad queries, wastes tokens when only the first items are needed, and can blow context on very large result sets.

_(difficulty: medium; tags: pagination, context)_

---

**Q:** What happens to tool selection as the number of similar tools grows past a handful?

**A:** Accuracy drops noticeably; do not expose dozens of similar tools at once by default.

_(difficulty: easy; tags: tool-selection, scaling)_

---

**Q:** Describe progressive availability for a large tool set.

**A:** Start with discovery tools (e.g., search_available_connectors), return a ranked shortlist, then dynamically add the selected matching tools so the agent uses them on later turns.

_(difficulty: medium; tags: progressive-availability, discovery)_

---

**Q:** Why is a monolithic find_and_execute tool worse than a discovery tool plus separate execution?

**A:** Search-and-execute hides the final decision and can perform the wrong action too early; discovery should narrow choices while the agent or user can still inspect before execution.

_(difficulty: hard; tags: progressive-availability, safety)_

---

**Q:** How does the Claude Agent SDK support progressive tool availability natively?

**A:** Through tool search and dynamic tool registration; MCP servers can also send list_changed notifications so clients refresh tools without reconnecting.

_(difficulty: medium; tags: agent-sdk, progressive-availability)_

---

**Q:** When tool outputs include ML confidence scores, what should the tool return besides raw confidence?

**A:** A derived requires_review boolean with review_reasons, calibrated against a labeled validation set, so agent behavior is consistent instead of over-trusting or over-escalating raw scores.

_(difficulty: medium; tags: requires-review, calibration)_

---

**Q:** Why is "Ready to post. Confirm?" with no details an unsafe confirmation prompt?

**A:** The tool must return enough structured detail (cost, target, schedule, irreversible effects, scope) for the user to catch a mistake, even if users usually click yes.

_(difficulty: medium; tags: confirmation, safety)_

---

**Q:** Why is dry_run: boolean on a single tool insufficient for a must-always-preview destructive action?

**A:** The model can simply call the tool with dry_run=false; use a structural preview-token-execute pattern instead.

_(difficulty: hard; tags: safety, preview-execute)_

---

**Q:** Describe the three-step structural pattern for a mandatory-preview workspace deletion.

**A:** preview_delete_workspace returns impact plus a one-time confirmation token; the user reviews; execute_delete_workspace requires the token and verifies it matches the previewed action.

_(difficulty: medium; tags: preview-execute, safety)_

---

**Q:** Do MCP tool annotations or descriptions enforce security?

**A:** No. Security belongs in code, hooks, permissions, and tool logic; annotations and descriptions are untrusted hints.

_(difficulty: easy; tags: security, annotations)_

---

**Q:** Why is encoding format hints in parameter names (e.g., date_string_iso_yyyy_mm_dd) a pitfall?

**A:** Format belongs in descriptions and schemas, not names; making everything a free-text string increases ambiguity and invalid combinations.

_(difficulty: medium; tags: parameter-design, pitfall)_

---

**Q:** List the tool-error categories and the correct handling for each.

**A:** Transient infrastructure: retry in tool with backoff; permanent validation: return structured details to correct or ask; business rule: non-retryable with user explanation; permission: non-retryable with escalation path; uncertain write state: report uncertainty, no auto-retry.

_(difficulty: hard; tags: error-categories, handling)_

---

**Q:** If a read-only API times out and immediate retries usually succeed, where should retry happen?

**A:** Inside the tool - it should absorb recoverable infrastructure noise; the model does not need to see the first failed network attempt.

_(difficulty: medium; tags: retry, tool-level)_

---

**Q:** Why must a payment/notification/order timeout after submission NOT be auto-retried?

**A:** The tool may not know whether the side effect occurred; blind retry causes duplicate charges, messages, or postings. Report uncertain state and require an idempotency key or user decision.

_(difficulty: medium; tags: uncertain-write, idempotency)_

---

**Q:** How should application-level tool errors be returned in MCP?

**A:** As normal tool results with isError: true, not uncaught exceptions; protocol-level failures use JSON-RPC errors.

_(difficulty: easy; tags: mcp-error, isError)_

---

**Q:** Distinguish MCP protocol errors from tool execution errors.

**A:** Protocol errors mean the request could not be processed at the protocol boundary (unknown tool, malformed JSON-RPC, missing required parameter). Tool execution errors mean the tool ran but the operation failed (404, 503, business rule, permission, rate limit) and use isError: true.

_(difficulty: hard; tags: mcp-error, tiers)_

---

**Q:** A check_availability(user_email) call omits user_email entirely. Protocol error or isError?

**A:** A JSON-RPC protocol error - the call was not even structurally well-formed against the schema.

_(difficulty: medium; tags: mcp-error, protocol)_

---

**Q:** The calendar API returns 404 because the user does not exist. Protocol error or isError?

**A:** A tool execution error with isError: true - the tool was invoked correctly; the operation simply failed. A missing record is data, not a protocol failure.

_(difficulty: medium; tags: mcp-error, isError)_

---

**Q:** Why is putting a missing-required-parameter failure in isError a bug?

**A:** It confuses the agent into retrying with the same bad call; a structural protocol violation should be a JSON-RPC error so the agent does not blindly retry.

_(difficulty: hard; tags: mcp-error, retry)_

---

**Q:** Why is putting a remote 503 into a JSON-RPC protocol error a bug?

**A:** It prevents the agent from trying again later; a transient upstream failure should be isError: true so the agent can decide to retry, switch tools, or escalate.

_(difficulty: hard; tags: mcp-error, retry)_

---

**Q:** Where should retry logic live when the model needs to change inputs or strategy?

**A:** At the model level - validation errors, syntax errors in user filters, or a wrong identifier require the model to change the request, not a silent tool retry.

_(difficulty: medium; tags: retry, model-level)_

---

**Q:** A search_catalog tool has 8% transient timeouts and 4% user-filter syntax errors. Correct design?

**A:** Retry the transient errors inside the tool with backoff and surface only the final outcome; surface syntax errors immediately with parameter validation details so the model can correct or ask the user.

_(difficulty: hard; tags: retry, error-classification)_

---

**Q:** Why is a retryable: true|false boolean alone weaker than actually retrying transient failures in the tool?

**A:** It still costs a model turn and risks the agent retrying anyway; actually retrying transient failures inside the tool is more reliable.

_(difficulty: medium; tags: retry, design-tradeoff)_

---

**Q:** For a write timeout of uncertain state, should the result be flagged retry_safe: true?

**A:** No. Mark it an error, communicate that delivery is unknown and may have occurred, and encourage a separate status lookup or user confirmation before acting.

_(difficulty: medium; tags: uncertain-write, safety)_

---

**Q:** What are MCP's three server-side building blocks and who controls each?

**A:** Tools (model-controlled actions), resources (application-controlled context), and prompts (user/application-controlled reusable templates).

_(difficulty: easy; tags: mcp, building-blocks)_

---

**Q:** Should a database schema or API spec the agent consults before acting be a resource or a tool?

**A:** A resource - it is stable reference material the agent reads like context; dynamic state requiring live computation should be a tool.

_(difficulty: easy; tags: mcp, resource-vs-tool)_

---

**Q:** Why are MCP resources and tools complements rather than alternatives?

**A:** Resources describe what is true and stable; tools describe what actions can be taken. Replacing resources with tools forces a call to learn anything; replacing tools with resources prevents acting at all.

_(difficulty: hard; tags: mcp, resource-vs-tool)_

---

**Q:** When is exposing data through an MCP server more valuable than a custom in-app tool?

**A:** When the integration should be reusable across multiple clients or applications; a deeply app-specific one-off workflow may be simpler as a custom tool.

_(difficulty: medium; tags: mcp, reusability)_

---

**Q:** Does MCP automatically solve authentication, rate limiting, retries, or caching?

**A:** No - those remain system design responsibilities; MCP is a protocol, not a complete middleware platform.

_(difficulty: easy; tags: mcp, scope)_

---

**Q:** An agent ignores a specialized MCP tool and uses generic search instead. Most likely fix?

**A:** Improve the MCP tool description: explain when it is preferable to generic alternatives, describe inputs/outputs, add examples, and mention key capabilities - do not remove all competing tools.

_(difficulty: medium; tags: mcp, tool-description)_

---

**Q:** Name the four standard MCP tool annotation hints.

**A:** readOnlyHint, destructiveHint, idempotentHint, and openWorldHint - hints that help the host build UI affordances but are not a security boundary.

_(difficulty: easy; tags: mcp, annotations)_

---

**Q:** How should a host treat a server advertising readOnlyHint: true on a destructive tool?

**A:** As an untrusted hint: use annotations to choose which prompt to show but never to skip a security check policy requires; base permission decisions on server trust, user policy, tool identity, and real risk.

_(difficulty: hard; tags: mcp, annotations, security)_



### Domain 3: Claude Code Configuration & Workflows

**Q:** Which built-in tool searches for text inside files?

**A:** Grep - use it for text/content inside files, not filename search.

_(difficulty: easy; tags: claude-code, grep)_

---

**Q:** Which built-in tool finds files by path or name pattern?

**A:** Glob - use it for filenames and paths, not for finding code references inside files.

_(difficulty: easy; tags: claude-code, glob)_

---

**Q:** Which tool combination is best for a full file replacement?

**A:** Read then Write - read the file first, then write the full replacement.

_(difficulty: easy; tags: claude-code, write)_

---

**Q:** Which tool is best for a targeted unique edit to a file?

**A:** Edit or MultiEdit - for precise targeted changes rather than a full rewrite.

_(difficulty: easy; tags: claude-code, edit)_

---

**Q:** Why should you not use filename search to find code references inside files?

**A:** Glob matches paths/names only; finding code references requires Grep, which searches file contents.

_(difficulty: medium; tags: grep, glob, tool-selection)_

---

**Q:** Describe the recommended codebase exploration workflow.

**A:** Grep for route names/error codes/identifiers, read matching entry files, follow imports to core abstractions, trace one or two execution paths, and summarize in a scratchpad when long.

_(difficulty: medium; tags: exploration, workflow)_

---

**Q:** Why not read hundreds of files upfront when exploring a codebase?

**A:** It floods context; map first by searching from entry points and following imports, then read selectively.

_(difficulty: medium; tags: exploration, context)_

---

**Q:** How should you tell Claude Code to follow existing project patterns?

**A:** Give concrete context using file references like @src/payments/repository.ts or @docs/testing.md rather than vague instructions like "follow our usual style."

_(difficulty: medium; tags: claude-code, file-references)_

---

**Q:** When should you use direct execution rather than plan mode?

**A:** For small, localized, low-risk changes where the target is clear; plan mode adds overhead for tiny edits.

_(difficulty: easy; tags: plan-mode, direct-execution)_

---

**Q:** Name four situations where plan mode is appropriate.

**A:** Changes spanning many files, architectural choices, migrations or breaking changes, needing stakeholder approval, or wanting read-only exploration before implementation.

_(difficulty: medium; tags: plan-mode, workflow)_

---

**Q:** How do you start Claude Code in plan mode, and how do you toggle modes interactively?

**A:** Use --permission-mode plan to start in plan mode; Shift+Tab toggles modes in interactive sessions.

_(difficulty: easy; tags: plan-mode, cli)_

---

**Q:** For an urgent production bug, when should you switch from direct fix to planning?

**A:** Gather evidence first; if the fix is obvious and narrow, implement directly; if the root cause reveals broad architectural impact, switch to planning before a larger change.

_(difficulty: medium; tags: plan-mode, debugging)_

---

**Q:** How does plan mode differ from extended thinking?

**A:** Plan mode is a workflow-control session mode that gates the transition from thinking to doing for human review; extended thinking is a model capability giving more internal reasoning budget for hard problems. Different problems, can be combined.

_(difficulty: hard; tags: plan-mode, extended-thinking)_

---

**Q:** The agent jumps straight to edits without surfacing trade-offs. Plan mode or extended thinking?

**A:** Plan mode - it gates doing behind a reviewable plan. Extended thinking would address shallow analysis, not premature action.

_(difficulty: hard; tags: plan-mode, extended-thinking)_

---

**Q:** The agent gives shallow analyses on a complex problem. Plan mode or extended thinking?

**A:** Extended thinking - it increases reasoning quality on hard problems; plan mode would only gate actions, not deepen reasoning.

_(difficulty: medium; tags: extended-thinking, reasoning)_

---

**Q:** What does the --continue flag do?

**A:** Resumes the most recent conversation in the current directory without prompting - best when the latest in-progress work is definitely the one you want.

_(difficulty: easy; tags: sessions, continue)_

---

**Q:** What does the --resume (-r) flag do?

**A:** Resumes a specific saved session, opening a picker if no identifier is given - best for selecting a specific historical or named session.

_(difficulty: easy; tags: sessions, resume)_

---

**Q:** What does the --session-id flag do?

**A:** Uses (or creates) a session with a specific UUID - best for programmatic workflows that need a stable known identifier.

_(difficulty: easy; tags: sessions, session-id)_

---

**Q:** What does --fork-session do and when is it the right tool?

**A:** Creates a new session branched from an existing transcript; right for exploring an alternative path or evaluating two approaches from the same prior state without contaminating the original.

_(difficulty: medium; tags: sessions, fork-session)_

---

**Q:** Why is --continue risky in a directory where you worked on multiple unrelated tasks?

**A:** "The latest" can be the wrong session; use a named or specific session when returning to a known investigation.

_(difficulty: medium; tags: sessions, continue)_

---

**Q:** Why is --fork-session preferable to resuming the original session twice for comparing two approaches?

**A:** The original stays untouched and each fork is a separate transcript copied at the fork point, so two diverging conversations don't get tangled and tool-call history is preserved.

_(difficulty: hard; tags: sessions, fork-session)_

---

**Q:** Sessions persist conversation history but not what?

**A:** Not filesystem state; for isolated file changes use git branches or worktrees.

_(difficulty: medium; tags: sessions, worktrees)_

---

**Q:** To compare two alternative implementations cleanly, what two things should you isolate?

**A:** Fork the session so each approach's conversation evolves independently AND use a separate worktree so file changes do not collide; doing only one leaves them tangled.

_(difficulty: hard; tags: sessions, worktrees)_

---

**Q:** Why avoid resuming the same session in multiple terminals at once?

**A:** Both processes can append to the same session history, making later resumes confusing.

_(difficulty: easy; tags: sessions, pitfall)_

---

**Q:** If the codebase changed since the previous session, when resume vs start fresh?

**A:** Resume and name the changed files/functions when most prior context is still useful; start fresh with a summary when the old transcript is likely stale or misleading.

_(difficulty: medium; tags: sessions, stale-context)_

---

**Q:** Why might the same session that wrote code be a weak reviewer of it?

**A:** Its context includes the earlier reasoning, so it is less critical of its own choices; use a fresh review context, review subagent, CI review, or a separate session with the diff.

_(difficulty: medium; tags: self-review, context-isolation)_

---

**Q:** What belongs in a scratchpad for a long codebase investigation?

**A:** Important files, data flow, open questions, confirmed assumptions, risk areas, and next steps - durable findings that survive context compaction or a session handoff.

_(difficulty: easy; tags: scratchpad, investigation)_

---

**Q:** What does CLAUDE.md store and when is it loaded?

**A:** Project or user memory (build commands, conventions, architecture notes, testing standards) auto-loaded into Claude Code's context on every turn based on a hierarchy.

_(difficulty: easy; tags: claude-md, memory)_

---

**Q:** Describe the CLAUDE.md memory hierarchy.

**A:** Root CLAUDE.md applies project-wide; subdirectory CLAUDE.md files layer on top for that subtree; a user-level memory file applies across all the user's projects; more specific files refine or override general ones for their area.

_(difficulty: medium; tags: claude-md, hierarchy)_

---

**Q:** What does @path/to/file.md syntax do in CLAUDE.md?

**A:** It imports additional shared content without copy-pasting - the right way to reuse a standards document across multiple CLAUDE.md files.

_(difficulty: easy; tags: claude-md, imports)_

---

**Q:** Team-wide rules vs personal preferences: where does each belong?

**A:** Team-wide rules belong in repo-tracked CLAUDE.md files so all collaborators benefit; personal preferences (commit style, test shortcuts) belong in user-level memory, not shared files.

_(difficulty: medium; tags: claude-md, scoping)_

---

**Q:** Claude inconsistently follows project conventions. What is the first diagnostic step?

**A:** Use /memory to confirm the expected memory file is actually loaded for the current working directory; if it is not loaded, no extra prompting fixes it - the problem is loading scope, not wording.

_(difficulty: medium; tags: memory, debugging)_

---

**Q:** Does Claude Code use a .claude/rules/ folder with per-rule YAML frontmatter for path scoping?

**A:** No. The mechanism is CLAUDE.md files plus @import references; path scoping comes from placing CLAUDE.md at the right directory level, and sharing from @imports. YAML-frontmatter rule files are not the standard model.

_(difficulty: hard; tags: claude-md, misconception)_

---

**Q:** Why not put an occasional code-review checklist in global CLAUDE.md?

**A:** Memory files are read every turn, so workflow-specific content costs tokens and dilutes ordinary work; put it in a slash command or review subagent instead.

_(difficulty: medium; tags: claude-md, slash-commands)_

---

**Q:** What are slash commands used for?

**A:** Reusable prompts for explicit workflows developers invoke intentionally (e.g., /review, /release-notes, /migration-plan); project commands are shared with the repo, user commands are personal.

_(difficulty: easy; tags: slash-commands, workflow)_

---

**Q:** What can a PreToolUse hook do?

**A:** Fire before a tool call to deny, allow, ask for approval, defer to normal permission rules, inject additional context, or modify the tool's input - the correct class for must-always-require-approval policies.

_(difficulty: medium; tags: hooks, pretooluse)_

---

**Q:** Why is a PreToolUse hook the canonical way to enforce hard rules in Claude Code?

**A:** Hooks run as code in your environment, so the model cannot talk around them - that is exactly why hard rules belong there rather than in prompt instructions.

_(difficulty: medium; tags: hooks, enforcement)_

---

**Q:** What is PostToolUse useful for?

**A:** Logging, formatting, secondary checks, or appending follow-up context after a tool call.

_(difficulty: easy; tags: hooks, posttooluse)_

---

**Q:** What can a UserPromptSubmit hook do?

**A:** Fire when the user submits a prompt to block the submission, modify it, or attach extra context.

_(difficulty: easy; tags: hooks, userpromptsubmit)_

---

**Q:** What is the SessionStart hook useful for?

**A:** Loading project context, setting up environment variables, or running pre-flight checks once when a session begins.

_(difficulty: easy; tags: hooks, sessionstart)_

---

**Q:** Why must you treat hook configurations as security-sensitive code?

**A:** Hooks execute shell commands in your environment; a malicious or buggy hook can damage the system or exfiltrate data, so review third-party hooks and avoid secrets in loggable arguments.

_(difficulty: medium; tags: hooks, security)_

---

**Q:** To block destructive Bash patterns unless approved, prompt instruction or hook?

**A:** A PreToolUse hook/permissions - prompt instructions are not tamper-proof, but hook code cannot be talked around by the model.

_(difficulty: hard; tags: hooks, enforcement, bash)_

---

**Q:** What characterizes good subagent design in Claude Code?

**A:** A clear single responsibility, a specific description so Claude knows when to use it, limited tools for the role, and an output contract the coordinator can consume.

_(difficulty: medium; tags: subagents, design)_

---

**Q:** Does a Claude Code subagent inherit the parent's conversation or CLAUDE.md automatically?

**A:** No. It receives its AgentDefinition and the prompt the parent constructed; CLAUDE.md is not always loaded into it, so the parent must restate every fact (including conventions) the subagent needs.

_(difficulty: hard; tags: subagents, context)_

---

**Q:** Why doesn't a second invocation of the same subagent continue where the first left off?

**A:** Each call is fresh with no inherited memory; if state must persist the parent persists it (a file or note) and re-supplies the relevant slice each call.

_(difficulty: medium; tags: subagents, state)_

---

**Q:** What is the most effective kind of feedback for iterating with Claude on code?

**A:** Concrete, executable feedback: a specific failing input, the expected and actual output, a validation error, or the failing test name and assertion - not "handle edge cases better."

_(difficulty: medium; tags: iteration, feedback)_

---

**Q:** Describe the effective coding iteration loop.

**A:** Define behavior with tests/examples, ask for the smallest useful implementation, run tests, feed back exact failures, and iterate one failure class at a time.

_(difficulty: easy; tags: iteration, testing)_

---

**Q:** When the same defect recurs across runs of the same prompt, retry or structural change?

**A:** A structural change - add a few-shot example, split a tool, or surface a new field; prompt-level fixes generalize while per-instance retries do not.

_(difficulty: hard; tags: iteration, prompt-design)_

---

**Q:** List signs that generated tests are low value.

**A:** They only assert code does not throw, duplicate existing coverage, ignore project fixtures, test implementation details rather than behavior, or miss important branches and error paths.

_(difficulty: medium; tags: test-generation, quality)_

---

**Q:** For reducing false positives in a code-review agent, vague "be conservative" or few-shot examples?

**A:** Few-shot examples are more effective - show acceptable code patterns next to genuinely problematic ones; also add fields like detected_pattern or rule_id so dismissals become signal.

_(difficulty: hard; tags: code-review, few-shot)_



### Domain 4: Prompt Engineering & Structured Output

**Q:** Is Claude's Messages API stateful or stateless?

**A:** Stateless - Claude does not remember previous API calls; the application must send the full current context (system prompt, prior messages, state, retrieved docs, tool results) on each request.

_(difficulty: easy; tags: stateless, messages-api)_

---

**Q:** An assistant forgets a fact from two turns ago in a short conversation. Most likely cause?

**A:** The application is not sending those prior messages; there is no magic memory flag - the model only sees what the request contains.

_(difficulty: medium; tags: stateless, context)_

---

**Q:** Is treating a session_id as model memory correct?

**A:** No. A session_id can locate stored context in your system but does not change what Claude sees; the model only sees the request contents.

_(difficulty: medium; tags: stateless, session-id)_

---

**Q:** Where does the system prompt go in the Messages API?

**A:** In the top-level system parameter, not a "system" role inside messages; user and assistant turns go in messages.

_(difficulty: easy; tags: messages-api, system-prompt)_

---

**Q:** How is tool use represented in Messages API content blocks?

**A:** Assistant messages can contain tool_use blocks and user messages can contain tool_result blocks.

_(difficulty: easy; tags: messages-api, tool-use)_

---

**Q:** What are the two related ways to get machine-readable output from Claude?

**A:** JSON structured outputs via output_config.format with a JSON Schema, and tool use / strict tool use that constrains tool-call parameters.

_(difficulty: easy; tags: structured-output, tool-use)_

---

**Q:** When use JSON structured outputs vs tool use for structured output?

**A:** Use JSON structured outputs when the final assistant response itself should be JSON; use tool use when the structured output represents a function call, extraction step, or intermediate agent action.

_(difficulty: easy; tags: structured-output, tool-use)_

---

**Q:** What does tool_choice: auto mean?

**A:** Claude may call a tool or answer normally - suitable for general agents where tool use is optional.

_(difficulty: easy; tags: tool-choice, auto)_

---

**Q:** What does tool_choice: any guarantee?

**A:** Claude must call one of the provided tools - useful for extraction where the document type is unknown but one tool from a set must be used.

_(difficulty: easy; tags: tool-choice, any)_

---

**Q:** What does tool_choice with a specific tool name do?

**A:** Forces Claude to call that specific named tool - e.g., a pipeline stage that must produce one schema before enrichment.

_(difficulty: easy; tags: tool-choice, tool)_

---

**Q:** What does tool_choice: none do?

**A:** Prevents Claude from calling tools - a pure text response or a step where tools are unsafe or unneeded.

_(difficulty: easy; tags: tool-choice, none)_

---

**Q:** Why is tool_choice: "any" better than auto plus a prompt saying "use a tool"?

**A:** auto with instructions can still produce conversational text in edge cases; any cannot - it guarantees a tool call without choosing the schema in advance.

_(difficulty: hard; tags: tool-choice, reliability)_

---

**Q:** To guarantee a specific extraction tool runs first, what is reliable vs unreliable?

**A:** Reliable: tool_choice with that specific tool name for the first call. Unreliable: reordering tool definitions or relying on system-prompt priority.

_(difficulty: hard; tags: tool-choice, pipeline)_

---

**Q:** Why is schema-backed output more reliable than asking for free-form text that "looks like JSON"?

**A:** Schema-backed output is constrained, so it is far less fragile than prompt-only JSON for production pipelines feeding databases, workflow engines, or audits.

_(difficulty: medium; tags: structured-output, reliability)_

---

**Q:** Give the recommended extraction-system pattern using a forced tool.

**A:** Define an extraction tool whose input schema is the desired output, force it with tool_choice, validate the result in code, and on semantic failure re-call Claude with the source, invalid extraction, and exact validation errors.

_(difficulty: medium; tags: extraction, validation-loop)_

---

**Q:** Why can a large tool definition plus a long document degrade accuracy near the document's end?

**A:** Tool definitions, schemas, and tool-use/result blocks count as input tokens; total context consumption can approach the effective attention boundary, degrading content near the end - not a model defect.

_(difficulty: hard; tags: context, token-cost)_

---

**Q:** Name operational implications of JSON structured outputs.

**A:** First request for a schema may have extra latency while the grammar compiles; schemas are cached; very complex schemas can exceed compilation limits; refusals or max-token stops can still produce nonconforming output.

_(difficulty: medium; tags: structured-output, operations)_

---

**Q:** What is partial assistant prefill useful for, and what is the caveat?

**A:** Controlling response format (e.g., starting with { or a neutral opener) by continuing a partially filled assistant message; caveat: schema-constrained tool use is usually better for machine-readable output.

_(difficulty: medium; tags: prefill, format-control)_

---

**Q:** Why do cost and latency rise in long conversations?

**A:** Each turn includes the entire history, so input token count rises every message and latency rises proportionally - almost always input token growth, not a model or database defect.

_(difficulty: medium; tags: token-growth, latency)_

---

**Q:** Does a JSON Schema prove the source supported the extracted value?

**A:** No. A schema can verify attendee_count is an integer but not that the article actually stated an attendee count - schema compliance is not source truth.

_(difficulty: medium; tags: schema, provenance)_

---

**Q:** Why use optional or nullable fields for information that may be absent?

**A:** A required field with no source support structurally pressures the model to fabricate; teach it to return null, an empty array, or an explicit absence reason.

_(difficulty: medium; tags: schema, fabrication)_

---

**Q:** How should you handle an ambiguous classification in a schema?

**A:** Add an enum value like unclear (or other with a detail field) so the model has a correct option instead of being forced to pick.

_(difficulty: medium; tags: schema, enum)_

---

**Q:** Why is a strict enum without an escape hatch fragile in an evolving domain?

**A:** New categories keep appearing and cause validation failures; add an other value plus a paired *_detail string for the source's actual wording.

_(difficulty: medium; tags: enum, schema-evolution)_

---

**Q:** Give instruction phrasings that reduce fabrication in extraction.

**A:** "Extract only values stated in the source," "use null when not provided," "do not infer missing values from typical examples," "preserve informal measurements verbatim when no precise value is given."

_(difficulty: easy; tags: fabrication, instructions)_

---

**Q:** Why is a second "verify" LLM call generally inferior to fixing the schema for fabrication?

**A:** Verification adds cost and latency, can itself hallucinate or rationalize, and does not address the root cause - allowing null lets the first call signal absence directly, which is cheaper and more honest.

_(difficulty: hard; tags: fabrication, schema)_

---

**Q:** Distinguish null from an empty array in extraction semantics.

**A:** An empty pros array reads as "the reviewer mentioned no pros" (a real claim); null reads as "the document did not address pros" - choose deliberately when the distinction matters.

_(difficulty: hard; tags: schema, semantics)_

---

**Q:** When are few-shot examples especially effective in extraction?

**A:** When the model is inconsistent across varied document structures; complete input-output pairs for edge cases teach subtle distinctions and standardized formats better than verbose written rules.

_(difficulty: medium; tags: few-shot, extraction)_

---

**Q:** What provenance fields help high-stakes extraction?

**A:** Fields like source_location, source_quote, and effective_date, so reviewers can audit choices - critical with amendments, conflicting sections, or required citations.

_(difficulty: medium; tags: provenance, extraction)_

---

**Q:** Why might strict JSON structured outputs and the citation feature be incompatible?

**A:** Citations require interleaved citation blocks while JSON schemas require constrained JSON; for structured extraction plus provenance, represent source locations explicitly in your schema instead.

_(difficulty: hard; tags: citations, structured-output)_

---

**Q:** For a contract with amendments, why may a single scalar field be the wrong schema?

**A:** It loses original vs amended values; capture both with effective dates and locations so the precedence is auditable.

_(difficulty: medium; tags: schema, amendments)_

---

**Q:** What semantic errors do JSON Schema and strict tool use NOT catch?

**A:** Domain errors like line items not summing to totals, dates out of range, IDs not matching known records, missing required citations, or fields copied into the wrong category - add domain validation.

_(difficulty: medium; tags: semantic-validation, schema)_

---

**Q:** On semantic validation failure, what is more effective than a blind retry or temperature: 0?

**A:** A correction request that includes the source document, the previous extraction, and the exact validation errors; temperature 0 only removes variability without fixing the mismatch.

_(difficulty: hard; tags: validation-loop, retry)_

---

**Q:** How do you make invoice total mismatches auto-detectable?

**A:** Add explicit reconciliation fields (e.g., calculated_total, stated_total, totals_match) and flag mismatches automatically rather than forcing the model to reconcile values it cannot verify.

_(difficulty: medium; tags: reconciliation, validation)_

---

**Q:** Which extraction failure cannot be fixed by retrying with the same input?

**A:** When the needed information is in an external document not provided to the model - retries only hallucinate; retrieve the missing source or route to human review.

_(difficulty: hard; tags: retry, limits)_

---

**Q:** A locale number "1,234" must become integer 1234. Can a retry with feedback fix it?

**A:** Yes - format mismatches like locale numbers or ISO datetime vs date-only are easily fixed on retry with feedback, unlike genuinely missing source information.

_(difficulty: medium; tags: retry, formatting)_

---

**Q:** For a long but in-context document with scattered facts, what outperforms raw extraction or mechanical chunking?

**A:** A model-driven pre-extraction pass that surfaces relevant sections into a structured intermediate, then extraction against that intermediate; it keeps the model focused and reduces missed scattered details.

_(difficulty: hard; tags: long-documents, pre-extraction)_

---

**Q:** When chunking vs pre-extraction summarization for long documents?

**A:** Chunk when documents exceed context limits or sections are independent; use pre-extraction summarization when the document fits but key facts are scattered. Chunking loses cross-section relationships; summarization alone loses exact values.

_(difficulty: hard; tags: long-documents, chunking)_

---

**Q:** Is confidence: 0.92 a 92% accuracy guarantee?

**A:** No. Self-reported confidence is useful only after calibration against a labeled validation set measured by document type, field, source quality, and confidence band.

_(difficulty: medium; tags: confidence, calibration)_

---

**Q:** What should route an extraction to human review?

**A:** Low calibrated confidence, ambiguous or contradictory source content, high-impact fields, failed semantic validation, and new or historically error-prone document types.

_(difficulty: easy; tags: human-review, routing)_

---

**Q:** Why is verifying only aggregate accuracy insufficient before automating extractions?

**A:** A 97% overall pipeline can be 80% on a specific document type or field; break down accuracy by segment before raising the automation threshold - comparing thresholds first is premature.

_(difficulty: hard; tags: automation, segmentation)_

---

**Q:** Even after automation begins, why keep sampling high-confidence outputs?

**A:** Stratified random review of a fixed percentage detects hidden systematic errors that look reasonable to humans not reading the source; downstream complaints alone miss them.

_(difficulty: medium; tags: automation, sampling)_

---

**Q:** When a recurring failure mode is identified, what is usually the highest-leverage fix?

**A:** Adding a few-shot example demonstrating correct handling; fine-tuning, regex post-processing, or new schema fields are heavier interventions to consider only if focused prompt/schema changes do not move the metric.

_(difficulty: hard; tags: feedback-loop, few-shot)_

---

**Q:** For dismissed code-review findings, what fields enable analyzing over-reporting?

**A:** detected_pattern, rule_id, or evidence so analysts see which code construct triggered each finding; without them you only see "35% dismissed," not which constructs to suppress.

_(difficulty: medium; tags: feedback-loop, code-review)_

---

**Q:** When does the Message Batches API make sense for extraction?

**A:** High-volume asynchronous work that tolerates delayed results; use real-time Messages API for urgent documents, interactive flows, or SLA-sensitive alerts.

_(difficulty: easy; tags: batch, extraction)_

---

**Q:** Why must batch results be joined by custom_id?

**A:** Results may not arrive in the same order as requests; always join by custom_id, never by position.

_(difficulty: easy; tags: batch, custom-id)_

---

**Q:** For mixed urgency, route per-document or per-batch?

**A:** Per-document: standard docs to the Batch API for cost savings, urgent ones to real-time. Batching everything then expediting inside the batch defeats the purpose because batch latency is the issue.

_(difficulty: hard; tags: batch, routing)_

---

**Q:** For 50,000 documents under a two-week deadline with iteration expected, what is the best strategy?

**A:** Submit everything to the Batch API for the bulk discount, then submit failures in successive refined batches; ten sequential 5,000 batches costs more calendar time without meaningful learning.

_(difficulty: hard; tags: batch, bulk-extraction)_

---

**Q:** Approximately what discount does batch processing offer and what is the worst-case window?

**A:** Roughly 50% off equivalent on-demand pricing, with up to a 24-hour completion window; design SLAs around the 24-hour worst case.

_(difficulty: easy; tags: batch, cost)_

---

**Q:** Why is forcing text JSON with prompt instructions a pitfall when tool use is available?

**A:** Prompt-only JSON is more fragile than schema-backed tool use; also it ignores tool-definition token cost and people confuse auto with required tool use.

_(difficulty: medium; tags: structured-output, pitfall)_

---

**Q:** Why is using batch processing solely for cost a pitfall?

**A:** Latency and SLA dominate; if a result is needed immediately the discount does not matter, and batch is wrong when humans are waiting interactively.

_(difficulty: medium; tags: batch, sla)_



### Domain 5: Context Management & Reliability

**Q:** In one sentence, what is context management?

**A:** Context management is state management: the model sees a request, not your database, so you decide what to include.

_(difficulty: easy; tags: context-management, state)_

---

**Q:** Match need to strategy: recent conversational flow.

**A:** Keep recent turns verbatim.

_(difficulty: easy; tags: context-strategy, sliding-window)_

---

**Q:** Match need to strategy: long-term narrative continuity.

**A:** Progressive summaries that extract decisions and themes.

_(difficulty: easy; tags: context-strategy, summarization)_

---

**Q:** Match need to strategy: current user preferences.

**A:** A structured state object representing current truth.

_(difficulty: easy; tags: context-strategy, structured-state)_

---

**Q:** Match need to strategy: exact facts and numbers.

**A:** Retrieval from source or a structured fact store.

_(difficulty: easy; tags: context-strategy, retrieval)_

---

**Q:** Match need to strategy: persistent creative canon.

**A:** A compact "bible" or reference section retained verbatim.

_(difficulty: easy; tags: context-strategy, reference-section)_

---

**Q:** Match need to strategy: tool-heavy workflows.

**A:** Extract the relevant fields and discard verbose payloads.

_(difficulty: easy; tags: context-strategy, tool-compression)_

---

**Q:** How does a sliding window work and when does it fail?

**A:** It keeps the most recent messages and drops older ones - simple and cheap, but it fails when users refer back to earlier decisions, preferences, or exact data.

_(difficulty: easy; tags: sliding-window, limits)_

---

**Q:** When is a sliding window the right choice based on production logs?

**A:** When logs show older messages are rarely referenced - e.g., 94% of messages only reference the last 3-5 exchanges and the rest ask for easily re-stated info; keep the last 8-10 turns plus the system prompt.

_(difficulty: medium; tags: sliding-window, traffic-analysis)_

---

**Q:** How should you handle accumulated RAG results that crowd out conversation coherence?

**A:** Apply a sliding window specifically to RAG results (keep the last 2-3 retrievals) while preserving conversation history under its own policy; aggressive dedup or one big digest is rarely better.

_(difficulty: hard; tags: sliding-window, rag)_

---

**Q:** What does progressive summarization do?

**A:** Replaces older conversation blocks with a running structured summary while keeping recent turns verbatim.

_(difficulty: easy; tags: summarization, hybrid)_

---

**Q:** What should a useful progressive summary explicitly extract?

**A:** Decisions, current preferences, open questions, and important facts - not a vague narrative that loses the exact facts users later ask about.

_(difficulty: easy; tags: summarization, structure)_

---

**Q:** Why is increasing a sliding window from 25 to 50 turns rarely the right fix?

**A:** It just defers the limit; a hybrid of structured summaries for older turns plus recent turns verbatim preserves long-term continuity at much lower token cost.

_(difficulty: hard; tags: sliding-window, hybrid)_

---

**Q:** What content needs a persistent reference section?

**A:** Content that must stay exact and stable across the whole conversation: story bibles, user-defined terms, critical safety info (allergies, medication interactions), and active scaling parameters.

_(difficulty: easy; tags: reference-section, safety)_

---

**Q:** Why separate a reference section from the trimmed discussion?

**A:** Applying a single summarization pass over both risks losing the exact details (allergies, serving counts, definitions) the user expects to remain consistent.

_(difficulty: medium; tags: reference-section, summarization)_

---

**Q:** For a dinner-party session with allergies, serving counts, and general back-and-forth, what strategy combination works?

**A:** Extract critical data into a compact reference section, summarize general discussion, and retain recent exchanges verbatim - a pure sliding window loses allergies; a single summary blurs the serving count.

_(difficulty: hard; tags: hybrid, reference-section)_

---

**Q:** When users revise preferences mid-conversation, what is the most reliable design?

**A:** Maintain a canonical structured state object representing current truth and include it in each request; update it whenever a preference changes.

_(difficulty: medium; tags: structured-state, preferences)_

---

**Q:** Why is structured state better than a system-prompt instruction to "always prioritize the most recently stated preferences"?

**A:** The model usually does but not reliably enough; a single canonical state object gives one source of truth instead of asking the model to infer current truth from old and new values.

_(difficulty: hard; tags: structured-state, reliability)_

---

**Q:** A user says "very low risk tolerance" then "maximize returns like my friends did with crypto." What should the agent do?

**A:** Surface the contradiction and ask which priority should govern; a balanced compromise risks recommending something that fits neither stated preference.

_(difficulty: hard; tags: conflicting-goals, clarification)_

---

**Q:** How can structured state help a customer raising three issues across 45 turns?

**A:** Track each issue's current status (order ID, amounts, resolution state) independently of the linear conversation so the agent can reliably answer about any one later.

_(difficulty: medium; tags: structured-state, customer-service)_

---

**Q:** When must you use retrieval or a fact store instead of summaries?

**A:** When users need exact p-values, source quotes, clauses, measurements, transaction IDs, or numeric thresholds - summaries lose precision.

_(difficulty: easy; tags: retrieval, fact-store)_

---

**Q:** A research assistant summarizes after 8 turns but users then ask for precise numbers the summary blurred. Most direct fix?

**A:** Re-inject the relevant source sections on demand when a question signals it needs precision; a full structured fact store is heavier and higher-fidelity summaries balloon back into the document.

_(difficulty: hard; tags: retrieval, summarization)_

---

**Q:** How should verbose tool results be compressed?

**A:** After a tool result is processed, extract the fields that matter and drop the rest (e.g., keep order_id, items, return_window, resolution_state; discard internal backend fields).

_(difficulty: medium; tags: tool-compression, context)_

---

**Q:** A lookup_order tool returns 40+ fields and was called many times during a return investigation. Best handling?

**A:** Compress each prior order response to its return-relevant fields then make additional lookups - more reliable than accumulating raw responses, summarizing all into prose, or moving them to a vector DB.

_(difficulty: hard; tags: tool-compression, investigation)_

---

**Q:** Why shouldn't a returning user be served from stale tool outputs in an old transcript?

**A:** Tool results age; start with a structured summary of prior interaction, then fetch fresh state before making claims about current status.

_(difficulty: medium; tags: stale-data, returning-users)_

---

**Q:** What should a good returning-session summary contain?

**A:** User issue, prior actions, known IDs, last-known status with timestamp, and a fresh_lookup_required flag - then targeted fresh lookups.

_(difficulty: medium; tags: returning-users, summary)_

---

**Q:** Why not just resume the old session and instruct the agent to "prefer the most recent tool results"?

**A:** The agent often references old tool results regardless, especially when older ones are more detailed; starting fresh with a structured summary plus targeted fresh lookups is the most reliable pattern.

_(difficulty: hard; tags: stale-data, returning-users)_

---

**Q:** When an external system updates state during an active chat, how should Claude learn about it?

**A:** Include the fresh state in the next model request (system/application context block, injected state section, or a prefix on the next user turn); do not expect Claude to know about events outside the request.

_(difficulty: medium; tags: external-updates, state)_

---

**Q:** Should the agent emit unsolicited assistant messages when external state changes mid-chat?

**A:** No - do not generate unsolicited messages unless the product intentionally supports proactive notifications; just make current state clearly more authoritative than stale prior tool results.

_(difficulty: medium; tags: external-updates, proactive)_

---

**Q:** Why version system prompts for users with ongoing multi-session conversations?

**A:** Changing a system prompt midstream can make old context conflict with new behavior; associate each conversation with the version it started under or use a deliberate migration strategy.

_(difficulty: medium; tags: prompt-versioning, sessions)_

---

**Q:** What does "confusing context capacity with attention" mean?

**A:** A 200K window does not mean every detail is equally salient; large capacity does not guarantee the model attends equally to all of it.

_(difficulty: medium; tags: attention, context-window)_

---

**Q:** Is the system prompt a one-time initialization message?

**A:** No. It must be included in every request; Claude has no memory between calls, so omitting it on later turns makes behavior diverge immediately, not gradually.

_(difficulty: easy; tags: system-prompt, stateless)_

---

**Q:** Even when the system prompt is sent every call, why can behavior still drift in long conversations?

**A:** Attention to it weakens as recent assistant outputs and latest user turns compete for attention; the fix is structural - reinforce at breakpoints, version the prompt, move hard rules into code.

_(difficulty: hard; tags: prompt-dilution, attention)_

---

**Q:** What are XML-style tags in a system prompt good for?

**A:** Improving salience and organization, especially when the same word means different things in different contexts and when you want constraints referenceable later ("apply the rule from <safety>"). They are not magic.

_(difficulty: medium; tags: system-prompt, xml-tags)_

---

**Q:** When external state changes without the agent asking, system prompt or tool result?

**A:** The system prompt for the next call - it is the natural home for what is currently true about the user/account/environment; tool results are for information the agent itself requested.

_(difficulty: hard; tags: system-prompt, external-updates)_

---

**Q:** When should you use general principles vs explicit conditionals in a system prompt?

**A:** Principles for judgment-heavy behavior (adapt depth to expertise, one clarifying question at a time); explicit conditionals for safety-critical triggers and policy bright lines.

_(difficulty: medium; tags: principles, conditionals)_

---

**Q:** If a rule must hold 100% of the time, where does it belong?

**A:** Out of the prompt and into code - prompt instructions are probabilistic guidance, not deterministic enforcement.

_(difficulty: easy; tags: enforcement, conditionals)_

---

**Q:** Why is translating every nuanced behavior into explicit conditionals an over-correction?

**A:** It forces shallow keyword matching and misclassifies users who phrase things atypically; a general principle lets the model integrate dozens of implicit signals like vocabulary and follow-up specificity.

_(difficulty: hard; tags: principles, conditionals)_

---

**Q:** When do few-shot examples outperform long prose instructions in a system prompt?

**A:** When the model needs to learn distinctions (beginner vs expert explanations, acceptable vs reportable findings, handling missing info) - examples are denser than prose for behavior the model must learn rather than recite.

_(difficulty: medium; tags: few-shot, system-prompt)_

---

**Q:** A system prompt has grown into long bulleted rule lists and behavior drifts. Best fix?

**A:** Replace chunks of rules with two or three contrasting examples; the model cannot keep all rules salient at once, and examples restore adherence more reliably than more prose.

_(difficulty: hard; tags: prompt-dilution, few-shot)_

---

**Q:** What is prompt dilution?

**A:** System-prompt adherence weakening as a conversation grows, even before the context window is full, because the assistant's previous responses become a behavioral pattern.

_(difficulty: medium; tags: prompt-dilution, attention)_

---

**Q:** Name mitigations for prompt dilution.

**A:** Concise well-structured prompts, critical instructions in salient sections, behavioral examples, natural reminders before complex tasks, and enforcing important rules outside the model.

_(difficulty: medium; tags: prompt-dilution, mitigation)_

---

**Q:** Describe the user-role reminder reinforcement pattern.

**A:** At a phase change (finishing one task, returning after idle, switching topics) append a brief user-role message restating current constraints - more effective than re-sending the whole system prompt because it integrates with the flow the model is attending to.

_(difficulty: hard; tags: reinforcement, prompt-dilution)_

---

**Q:** How should the system prompt be treated for multi-day sessions?

**A:** As living configuration - allow the application to update it between turns to reflect what is now true (current plan, latest decisions, completed steps); the full messages still go in the messages array.

_(difficulty: medium; tags: prompt-versioning, living-config)_

---

**Q:** When should an agent ask a clarifying question?

**A:** When multiple interpretations lead to substantially different actions, the action is irreversible or costly, the user expressed conflicting goals, or required information is truly missing.

_(difficulty: medium; tags: clarification, ambiguity)_

---

**Q:** When should an agent proceed with stated assumptions instead of asking?

**A:** When the action is low risk, context strongly suggests intent, and the user can easily correct the direction - state the assumption and invite redirection.

_(difficulty: medium; tags: assumptions, ambiguity)_

---

**Q:** For a genuinely ambiguous request, one clarifying question or a list of three or four?

**A:** One focused question that most changes your next action; multiple simultaneous questions feel like an interrogation and users often answer only the first.

_(difficulty: medium; tags: clarification, ux)_

---

**Q:** Why is front-loading many clarifying questions before any low-risk action usually wrong?

**A:** The cost of a small redirected effort is usually lower than the friction of long preflight Q&A; the exception is irreversible, costly, or regulated actions where you must ask first.

_(difficulty: hard; tags: clarification, risk)_

---

**Q:** A user wants both "the cheapest flight" and "arriving by 9 AM Friday nonstop." What should the agent do?

**A:** Name the tension explicitly and ask which constraint should bend; a hidden compromise produces a result satisfying neither stated goal and usually requires rework.

_(difficulty: hard; tags: conflicting-goals, clarification)_

---

**Q:** If responses become repetitive, why is a "never say X" list not the best first fix?

**A:** Better options are improved examples, a concise style guide, partial assistant prefill for the opener, or safe cosmetic post-processing; prefill a short neutral first phrase rather than expanding the system prompt.

_(difficulty: medium; tags: repetition, prefill)_
