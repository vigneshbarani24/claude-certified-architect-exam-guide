# claude-certified-architect-exam-guide

> The most comprehensive free study system for the **Claude Certified
> Architect – Foundations (CCAF)** exam. Study guide · flashcards · CLI quiz ·
> mock exam · NotebookLM bundles.

![GitHub stars](https://img.shields.io/github/stars/vigneshbarani24/claude-certified-architect-exam-guide?style=social)
![License](https://img.shields.io/badge/license-CC%20BY%204.0-blue)
![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen)
![Last Commit](https://img.shields.io/github/last-commit/vigneshbarani24/claude-certified-architect-exam-guide)

A community-owned, open-source study system for the CCAF exam. Built
ground-up from publicly available Anthropic documentation and the official
exam guide. No paywalls, no accounts, no third-party study sites.

## What's Inside

| Resource | Description | Format |
|----------|-------------|--------|
| Study Guide | 13 chapters across all 5 exam domains, cheat sheet, anti-patterns, study strategy | Markdown |
| Flashcards | 250 Q&A cards mapped to the 5 exam domains, Anki-compatible | CSV + JSON |
| CLI Quiz | Offline quiz runner with weak-area tracking | Python + TypeScript |
| Mock Exam | Scenario-based MCQ with explanations and shareable score cards | Web |
| NotebookLM Bundles | Per-domain markdown packages for audio study | Markdown |

## Quick Start

### Web

Visit the deployed site (see the repository's GitHub Pages / Vercel
deployment) or run it locally:

```bash
cd web
npm install
npm run dev
```

### CLI Quiz (Python)

```bash
cd scripts/python
pip install -r requirements.txt
python quiz.py --all
```

### CLI Quiz (TypeScript)

```bash
cd scripts/typescript
npm install
npx tsx quiz.ts --all
```

### Read the Guide

The entire study guide is a single file:
[`guide/exam-preparation-guide.md`](guide/exam-preparation-guide.md).

## Exam At a Glance

- **Format:** Multiple choice, one correct answer and three distractors.
- **Scoring:** Scaled score 100–1,000; minimum passing score 720. Pass/fail.
- **Unanswered questions** are scored as incorrect — there is no penalty for guessing.
- **Scenario-based:** Questions are framed by realistic production scenarios.

| Domain | Title | Weight |
|--------|-------|--------|
| 1 | Agentic Architecture & Orchestration | 27% |
| 2 | Tool Design & MCP Integration | 18% |
| 3 | Claude Code Configuration & Workflows | 20% |
| 4 | Prompt Engineering & Structured Output | 20% |
| 5 | Context Management & Reliability | 15% |

The exam tests **judgment about trade-offs**, not rote definitions. For every
scenario ask: where should responsibility live — the model, application code,
the tool/schema, or a human reviewer?

## Contributing

Contributions are very welcome — new flashcards, practice questions, content
corrections, and guide improvements. See
[`.github/CONTRIBUTING.md`](.github/CONTRIBUTING.md). The fastest path is to
open an issue using one of the templates, or submit a card directly from the
website's contribution flow.

All data files are validated by GitHub Actions before merge.

## License

Licensed under [Creative Commons Attribution 4.0 International (CC BY 4.0)](LICENSE).
You may share and adapt this work with attribution.

## Disclaimer

This is an independent community resource. It is not affiliated with, endorsed
by, or sponsored by Anthropic. No exam questions are reproduced or paraphrased
from the official exam. Content is based on publicly available Anthropic
documentation and the official exam guide. Licensed CC BY 4.0.
