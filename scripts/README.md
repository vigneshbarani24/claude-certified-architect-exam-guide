# Scripts

CLI tooling for the **Claude Certified Architect – Foundations (CCAF)**
open-source study system. Two parallel toolchains are provided: Python and
TypeScript. Both read the canonical data file
[`flashcards/all-domains.json`](../flashcards/all-domains.json).

```
scripts/
├── python/        quiz.py, generate_flashcards.py, generate_notebooklm.py
└── typescript/    quiz.ts, export.ts
```

## Data contract

`flashcards/all-domains.json` is a JSON array of:

```json
{
  "id": "d1-001",
  "domain": 1,
  "domain_name": "Agentic Architecture & Orchestration",
  "front": "<exam-style question>",
  "back": "<1-3 sentence answer>",
  "difficulty": "easy|medium|hard",
  "tags": ["tag-a", "tag-b"]
}
```

Domains: 1 Agentic Architecture & Orchestration · 2 Tool Design & MCP
Integration · 3 Claude Code Configuration & Workflows · 4 Prompt
Engineering & Structured Output · 5 Context Management & Reliability.

## Python tools

```bash
cd scripts/python
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
```

| Command | Purpose |
|---------|---------|
| `python quiz.py --domain 1` | Quiz one domain (offline) |
| `python quiz.py --all --shuffle` | Quiz everything, shuffled |
| `python quiz.py --domain 3 --difficulty hard` | Filter by difficulty |
| `python generate_notebooklm.py --all` | Build offline NotebookLM bundles |
| `python generate_flashcards.py --domain 1` | Generate cards via Claude API* |

\* `generate_flashcards.py` is the **only** script that makes network calls
and requires `ANTHROPIC_API_KEY`.

## TypeScript tools

```bash
cd scripts/typescript
npm install
npm run build        # tsc -> dist/
```

| Command | Purpose |
|---------|---------|
| `npm run quiz -- --domain 1` | Quiz one domain (offline) |
| `npm run quiz -- --all --shuffle` | Quiz everything, shuffled |
| `npm run quiz -- --domain 3 --difficulty hard` | Filter by difficulty |
| `npm run export -- --all --out anki-all.txt` | Export Anki TSV |
| `npm run export -- --domain 2 --out anki-d2.txt` | Export one domain |

Anki import: File → Import, separator = Tab, "Allow HTML" enabled.

Everything is offline except Python's `generate_flashcards.py`.
