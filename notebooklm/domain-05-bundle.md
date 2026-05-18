# NotebookLM Bundle — Domain 5: Context Management & Reliability

_Generated study bundle for the Claude Certified Architect (CCAF) exam. Offline build from the project study guide and flashcards. Not affiliated with Anthropic. Licensed CC BY 4.0._

## 1. Guide Sections

### 5. Conversation Context Management

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


## 3. Anti-Patterns and Common Pitfalls

### Pitfalls — Conversation Context Management

> [!WARNING]
> **Confusing context capacity with attention.** A 200K window does not mean every detail is equally salient.

> [!WARNING]
> **Summarizing exact facts into vague prose.** Use structured facts or retrieval when precision matters. Keeping every RAG result forever: use a sliding window for retrieved context unless earlier results remain relevant.

> [!WARNING]
> **Resuming old transcripts with stale tool results.** Summaries plus fresh lookups are safer.

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
