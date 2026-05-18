# Python tools

Python 3.11+ CLI tooling for the CCAF study system. Type hints on all
functions, no bare excepts.

## Install

```bash
cd scripts/python
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
```

Runtime dependencies (pinned in `requirements.txt`): `anthropic`, `rich`,
`click`.

## `quiz.py` — offline quiz runner

Loads `../../flashcards/all-domains.json` (resolved relative to the
script). Fully offline; no API calls.

```bash
python quiz.py --domain 1
python quiz.py --all
python quiz.py --domain 3 --difficulty hard
python quiz.py --all --shuffle
```

- `--domain {1-5}` or `--all` (one is required, mutually exclusive)
- `--difficulty {easy,medium,hard}` (optional)
- `--shuffle` (optional)

For each card it shows the question, waits for Enter, reveals the answer,
then you self-mark `y`/`n`. At the end it prints a colourised weak-area
table (per-domain accuracy %, weakest first). Ctrl-C shows a partial
summary and exits cleanly. A missing or empty data file exits with code 1
and a clear message.

## `generate_notebooklm.py` — offline bundle builder

Reads `../../guide/exam-preparation-guide.md` and the flashcard data, then
writes per-domain bundles (`notebooklm/domain-0X-bundle.md`) plus
`notebooklm/full-guide-bundle.md`. Each domain bundle packages the guide
section, related flashcards, the Anti-Patterns subsection, and scenario
excerpts. Missing inputs are skipped with a logged note.

```bash
python generate_notebooklm.py --domain 1
python generate_notebooklm.py --all
```

## `generate_flashcards.py` — Claude-powered generator (online)

The **only** script that makes network/API calls. Requires
`ANTHROPIC_API_KEY`. Splits the study guide into labelled sections, calls
the Claude API (`claude-sonnet-4-20250514`) per section, deduplicates
against existing cards by normalized front text, appends to the correct
per-domain CSV, and rebuilds `all-domains.json` with stable `dN-NNN` ids.

```bash
export ANTHROPIC_API_KEY=sk-ant-...
python generate_flashcards.py --domain 1
python generate_flashcards.py --all
python generate_flashcards.py --section "1.3"
```

Per-domain CSVs use the Anki-compatible header:

```
Front,Back,Domain,Difficulty,Tags
```

with tags comma-separated inside the quoted field.
