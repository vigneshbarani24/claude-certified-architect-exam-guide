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
| Progress & Sharing | XP, streaks, rank tiers, badges, and shareable score/rank cards | Web |

## Gamified & Shareable

The web app turns studying into a loop worth coming back to — and worth
sharing. Everything is **100% on-device** (localStorage); there is no server,
no account, and no tracking.

- **Shareable score cards.** Finish the mock exam and generate a branded PNG
  result card (score, pass proxy, per-domain breakdown) with one-click share
  to X and LinkedIn, or "Challenge a friend".
- **XP, streaks & ranks.** Earn XP for flashcards, mock questions, and guide
  reading; build a daily streak; climb from Apprentice → Practitioner →
  Architect → Master Architect.
- **Badges.** Unlock "Domain Cleared", "Centurion", "Perfect Mock", "Pass",
  and streak badges as you progress.
- **On-device leaderboard.** Your mock attempts ranked best-to-worst on
  `/leaderboard`, with a shareable rank card. Scores never leave your device —
  you share the card, not your data.

> Want to help the deck grow? Open a submission issue or send a card from the
> contribution flow — see [Contributing](#contributing).

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

## License, Copyright & Attribution

This is **original work**. Copyright © 2026 the
claude-certified-architect-exam-guide authors and contributors. It is licensed
to the public under [Creative Commons Attribution 4.0 International (CC BY
4.0)](LICENSE). Copyright is retained by the authors — the license is a
conditional permission grant, not a waiver.

You may share and adapt this work, including commercially, **only with
attribution**. See [`NOTICE`](NOTICE) for the exact required attribution
string and reuse terms, and [`CITATION.cff`](CITATION.cff) for citation
metadata. In short, if you reuse this:

- Credit "claude-certified-architect-exam-guide, © its authors and
  contributors, CC BY 4.0" with a link to the repo and the license.
- Keep all copyright, license, and attribution notices intact (in source,
  the site footer, the guide, and the data files).
- Do not imply endorsement by these authors or by Anthropic.

Removing attribution or republishing the content as your own violates the
license and terminates the rights it grants (CC BY 4.0 §6). If you find an
unattributed copy, that is a license violation you can report.

**Sources & upstream attribution.** The study guide adapts the
community-created, CC BY 4.0 "Independent Study Booklet" by Daron Yondem
(<https://github.com/daronyondem/claude-architect-exam-guide>), with
attribution; exam structure facts come from the public official Anthropic
exam guide. "Claude" and "Anthropic" are trademarks of Anthropic, PBC, used
nominatively only.

## Disclaimer

This is an independent community resource. It is not affiliated with, endorsed
by, or sponsored by Anthropic. No exam questions are reproduced or paraphrased
from the official exam. Content is based on publicly available Anthropic
documentation and the official exam guide. Licensed CC BY 4.0.
