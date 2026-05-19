# Contributing

Thanks for helping build the best free CCAF study system. This is a
community-owned resource under CC BY 4.0. All contributions are welcome:
flashcards, practice questions, content corrections, and guide edits.

## Ground Rules

- **No exam content.** Never reproduce or paraphrase real exam questions.
  Contribute original study material grounded in publicly available Anthropic
  documentation and the official exam guide.
- **Cite sources** for content corrections — link the relevant official
  Anthropic or MCP documentation page.
- Be technically accurate. When in doubt, prefer the guide's framing.

## 1. Adding Flashcards

Flashcards live in two synced places:

- `flashcards/domain-0X-*.csv` — Anki-compatible, header row exactly:
  `Front,Back,Domain,Difficulty,Tags`
- `flashcards/all-domains.json` — a JSON array consumed by the web app and
  CLI quiz.

Each JSON card object:

```json
{
  "id": "d1-051",
  "domain": 1,
  "domain_name": "Agentic Architecture & Orchestration",
  "front": "Precise exam-style question testing one concept.",
  "back": "Correct answer in 1-3 sentences.",
  "difficulty": "medium",
  "tags": ["agentic-loop", "stop-reason"]
}
```

Required fields: `id`, `domain` (1–5), `domain_name`, `front`, `back`,
`difficulty` (`easy` | `medium` | `hard`), `tags` (2–4 kebab-case tags). The
CSV row and JSON object for the same card must match exactly.

**Duplicate check:** `id` values must be unique and no two cards may share the
same `front` text. The CI validation will reject duplicates.

Domain numbering: 1 Agentic Architecture & Orchestration · 2 Tool Design & MCP
Integration · 3 Claude Code Configuration & Workflows · 4 Prompt Engineering &
Structured Output · 5 Context Management & Reliability.

## 2. Adding Practice Questions

The canonical question bank is `questions/all-questions.json`, validated
against `questions/schema.json`. The web app consumes a copy at
`web/src/data/questions.json`; the prebuild step
(`web/scripts/copy-bundles.mjs`) copies the canonical file over it, and the
copy is committed so the build works without the prebuild (same contract as
`flashcards/all-domains.json`). **Edit `questions/all-questions.json`, then
run `node web/scripts/copy-bundles.mjs` so the two files stay byte-identical.**

Each question object:

```json
{
  "id": "q-d1-015",
  "scenario": "Customer Support Resolution Agent",
  "domain": 1,
  "stem": "The situation and the question.",
  "options": [
    { "label": "A", "text": "..." },
    { "label": "B", "text": "..." },
    { "label": "C", "text": "..." },
    { "label": "D", "text": "..." }
  ],
  "correct": "A",
  "explanation": "Why A is correct and why the distractors are wrong.",
  "tags": ["escalation", "programmatic-enforcement"]
}
```

- `id` follows the scheme `q-dN-NNN` where `N` is the domain (1–5) and `NNN`
  is a zero-padded sequence number within that domain (e.g. `q-d1-001`,
  `q-d2-001`). The domain digit in the id must equal the `domain` field.
  Ids and stems must be unique.
- `scenario` must be **exactly** one of the six official scenario titles in
  `web/src/data/scenarios.ts`.
- `options` is exactly four entries with labels `A`, `B`, `C`, `D` in that
  order — an option's letter must match its position.
- Map every question to one domain (1–5). An `explanation` is required and
  should explain why the correct answer wins *and* why each distractor is a
  plausible-but-wrong choice. `tags` is 1–4 kebab-case tags.
- Distractors must be plausible, not obviously wrong.
- CI validates the bank with `scripts/python/validate_content.py` (counts,
  id scheme, scenarios, option order, duplicates, web-copy byte-match) and
  with `ajv` against `questions/schema.json`.

## 3. Correcting Content

Open a **Content correction** issue. Quote the exact text, describe the
problem, propose the fix, and cite the official Anthropic / MCP documentation
that supports it.

## 4. Study Guide Edits

- The guide is the single file `guide/exam-preparation-guide.md`.
- Keep the established structure: `### What to Know`, concept explanation, code
  snippet where applicable, and `> [!WARNING]` callout blocks for pitfalls.
- Comments-free prose; teach the trade-off, not just the definition.
- Run markdownlint locally before opening a PR.

## 5. Running Validation Locally

Before opening a PR:

```bash
# Validate flashcard CSV headers + JSON schema + duplicate ids
python scripts/python/validate_content.py 2>/dev/null || true

# Python lint
pip install ruff && ruff check scripts/python

# Web type check
cd web && npx tsc --noEmit
```

CI runs the full suite (CSV column check, JSON schema via `ajv`, duplicate-id
check, `markdownlint`, `tsc --noEmit`, `ruff check`) on every pull request to
`main`. A green check is required to merge.

## Recognition

Merged contributions are credited. Contributors are surfaced in the project's
contributor leaderboard — meaningful additions (new flashcards, questions,
guide chapters) earn a higher rank.

By contributing you agree to license your contribution under CC BY 4.0.
