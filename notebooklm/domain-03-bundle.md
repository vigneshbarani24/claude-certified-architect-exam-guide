# NotebookLM Bundle — Domain 3: Claude Code Configuration & Workflows

_Generated study bundle for the Claude Certified Architect (CCAF) exam. Offline build from the project study guide and flashcards. Not affiliated with Anthropic. Licensed CC BY 4.0._

## 1. Guide Sections

### 10. Claude Code and Claude Agent SDK Workflows

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

### 11. Iterative Refinement, Testing, and Evaluation

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

## 2. Flashcards

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


## 3. Anti-Patterns and Common Pitfalls

### Pitfalls — Claude Code and Claude Agent SDK Workflows

> [!WARNING]
> **Using plan mode for tiny edits.** It adds overhead. Using direct execution for broad migrations: you lose review and architecture planning.

> [!WARNING]
> **Assuming all session resumes are safe.** Old context may reference changed code. Using a global `CLAUDE.md` for task-specific checklists: use slash commands or subagents.

> [!WARNING]
> **Relying on prompt instructions for destructive Bash approval.** Use hooks/permissions.

---

### Pitfalls — Iterative Refinement, Testing, and Evaluation

> [!WARNING]
> **Asking for a full rewrite after a narrow failure.** Give the failing test and ask for a targeted fix.

> [!WARNING]
> **Using confidence without calibration.** Measure it against labeled data. Treating reviewer dismissals as noise: they are feedback.

> [!WARNING]
> **Adding infrastructure before improving examples and criteria.** Prompt/schema changes often solve repeated patterns.

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
