# NotebookLM Bundle — Domain 4: Prompt Engineering & Structured Output

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

### 4. Structured Data Extraction and Validation

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

### 12. Batch Processing, Cost, and Latency

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

### 6. System Prompt Engineering and Conversational Behavior

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

## 2. Flashcards

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


## 3. Anti-Patterns and Common Pitfalls

### Pitfalls — API Fundamentals and Output Control

> [!WARNING]
> **Assuming Claude has persistent memory.** It does not. Your app manages state and history.

> [!WARNING]
> **Treating `session_id` as model memory.** A session identifier can locate stored context in your system, but it does not automatically change what Claude sees.

> [!WARNING]
> **Forcing text JSON with prompt instructions when tool use is available.** Prompt-only JSON is more fragile than schema-backed tool use. Also: ignoring tool-definition token cost, and confusing `tool_choice: "auto"` with required tool use (`auto` allows tools; only `any` or a named tool guarantees a tool call).

### Pitfalls — Structured Data Extraction and Validation

> [!WARNING]
> **Treating valid JSON as correct data.** Syntax validation is only the first layer. Confusing schema compliance with source truth: a constrained decoder can guarantee shape, not that the source supports the value.

> [!WARNING]
> **Making absent source fields required.** This encourages hallucination. Using strict enums without escape hatches in evolving domains: add `other` plus detail or normalize later.

> [!WARNING]
> **Relying only on aggregate accuracy.** Accuracy can hide poor performance for specific fields or document types. Sending all long documents through one extraction call: chunk, summarize first, or use staged extraction when information is scattered.

---

### Pitfalls — Batch Processing, Cost, and Latency

> [!WARNING]
> **Choosing batch solely for cost.** Latency and SLA dominate.

> [!WARNING]
> **Assuming result order.** Always join by `custom_id`. Retrying all records after partial failure: resubmit only failures.

> [!WARNING]
> **Using batch for interactive refinement.** Use real-time calls when humans are waiting.

---

### Pitfalls — System Prompt Engineering and Conversational Behavior

> [!WARNING]
> **Using "IMPORTANT" and "NEVER" as reliability mechanisms.** They help salience but do not guarantee behavior.

> [!WARNING]
> **Adding endless conditionals.** This bloats the prompt and can reduce adherence. Hiding key rules in long prose: use sections and examples.

> [!WARNING]
> **Putting workflow-specific checklists in global memory.** Use slash commands or task-specific prompts when the checklist applies only sometimes.

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
