# NotebookLM Bundle — Domain 2: Tool Design & MCP Integration

_Generated study bundle for the Claude Certified Architect (CCAF) exam. Offline build from the project study guide and flashcards. Not affiliated with Anthropic. Licensed CC BY 4.0._

## 1. Guide Sections

### 2. Designing Tool Interfaces for LLM Agents

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

### 3. Error Handling in Agent Tools

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

### 7. Model Context Protocol (MCP)

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

## 2. Flashcards

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


## 3. Anti-Patterns and Common Pitfalls

### Pitfalls — Designing Tool Interfaces for LLM Agents

> [!WARNING]
> **Encoding format hints in parameter names.** Use descriptions and schemas, not names like `date_string_iso_yyyy_mm_dd`. Making everything a free-text string increases ambiguity and invalid combinations.

> [!WARNING]
> **Returning only human-readable prose.** Downstream tools need IDs and structured fields. Combining decision points: composite tools are good for mechanical work, not for hiding choices from the model.

> [!WARNING]
> **Assuming annotations or descriptions enforce security.** Security belongs in code, hooks, permissions, and tool logic.

---

### Pitfalls — Error Handling in Agent Tools

> [!WARNING]
> **Throwing exceptions for expected business errors.** Frameworks often hide exception details from the model.

> [!WARNING]
> **Marking uncertain side effects as retryable.** This causes duplicate charges, messages, or postings.

> [!WARNING]
> **Returning empty data for backend failures.** An empty list means "success with no matches," not "the API failed." Making the model parse free-text errors: give it structured fields.

---

### Pitfalls — Model Context Protocol (MCP)

> [!WARNING]
> **Using a tool where a resource is better.** Catalogs and schemas are often resources, not tools.

> [!WARNING]
> **Assuming MCP handles auth and retries automatically.** It is a protocol, not a complete middleware platform. Trusting self-reported annotations: trust the server and your policy controls.

> [!WARNING]
> **Writing minimal descriptions.** "Analyzes code" is not enough.

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
