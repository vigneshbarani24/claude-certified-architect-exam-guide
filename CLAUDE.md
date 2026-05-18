# claude-certified-architect-exam-guide

A community-owned, open-source study system for the **Claude Certified
Architect – Foundations (CCAF)** exam by Anthropic.

This is a monorepo. It contains the study guide, tooling scripts, flashcard
decks, NotebookLM export utilities, and a Next.js website — all in one place.

## Monorepo Structure

```
claude-certified-architect-exam-guide/
├── CLAUDE.md                      ← this file
├── README.md
├── LICENSE                        ← CC BY 4.0
├── .gitignore
├── .github/                       ← contributing, issue templates, workflows
├── guide/
│   └── exam-preparation-guide.md  ← THE single-file study guide
├── flashcards/                    ← 5 domain CSVs + all-domains.json
├── notebooklm/                    ← per-domain markdown bundles
├── scripts/
│   ├── python/                    ← quiz.py, generators, requirements.txt
│   └── typescript/                ← quiz.ts, export.ts
└── web/                           ← Next.js 14 + shadcn/ui + Tailwind
```

## Coding Standards

- TypeScript strict mode everywhere in `/web`
- Python 3.11+, type hints on all functions, no bare excepts
- No `any` in TypeScript unless unavoidable with an explanatory comment
- All data files validated by GitHub Actions before merge
- Comments only where logic is non-obvious
- No placeholder content — every file ships with real content

## Hard Constraints

- No external API calls at runtime in the web app — all data is static JSON
- No auth, no database, no paid services — Vercel free tier is sufficient
- All content under CC BY 4.0 — no verbatim reproduction of exam questions
- Python runtime deps: `anthropic`, `rich`, `click` only
- TypeScript runtime deps: `commander`, `chalk`, `inquirer` only
- Web deps: Next.js 14, Tailwind, shadcn only
- Must work fully offline except `generate_flashcards.py`

## Exam Domains & Weights

| Domain | Title | Weight |
|--------|-------|--------|
| 1 | Agentic Architecture & Orchestration | 27% |
| 2 | Tool Design & MCP Integration | 18% |
| 3 | Claude Code Configuration & Workflows | 20% |
| 4 | Prompt Engineering & Structured Output | 20% |
| 5 | Context Management & Reliability | 15% |

## Disclaimer

This is an independent community resource. It is not affiliated with,
endorsed by, or sponsored by Anthropic. No exam questions are reproduced or
paraphrased from the official exam. Content is based on publicly available
Anthropic documentation and the official exam guide. Licensed CC BY 4.0.
