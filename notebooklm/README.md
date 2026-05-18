# NotebookLM Study Bundles

These markdown files package the study guide, flashcards, and anti-patterns
into self-contained sources you can upload to
[NotebookLM](https://notebooklm.google.com) for audio overviews, quizzing, and
on-demand explanations.

## Bundles

| File | Contents |
|------|----------|
| `domain-01-bundle.md` | Agentic Architecture & Orchestration — guide sections, flashcards, anti-patterns, scenario excerpts |
| `domain-02-bundle.md` | Tool Design & MCP Integration |
| `domain-03-bundle.md` | Claude Code Configuration & Workflows |
| `domain-04-bundle.md` | Prompt Engineering & Structured Output |
| `domain-05-bundle.md` | Context Management & Reliability |
| `full-guide-bundle.md` | The entire guide plus all 250 flashcards in one upload |

> These files are generated from `guide/exam-preparation-guide.md` and the
> flashcard decks by `scripts/python/generate_notebooklm.py`. A GitHub Action
> regenerates them automatically when the guide or flashcards change — do not
> hand-edit them; edit the source instead.

To regenerate locally:

```bash
cd scripts/python
pip install -r requirements.txt
python generate_notebooklm.py --all       # all bundles
python generate_notebooklm.py --domain 1  # one domain
```

## How to Use with NotebookLM

1. **Download** the bundle for your target domain (or `full-guide-bundle.md`
   for everything in one notebook).
2. Go to [notebooklm.google.com](https://notebooklm.google.com) and create a
   new notebook.
3. **Upload the markdown file** as a source.
4. Ask the notebook to:
   - Generate an **Audio Overview** for passive study on a commute.
   - **Quiz you** ("ask me 10 hard scenario questions on this domain, one at a
     time, and grade my answers").
   - **Explain a concept** ("explain MCP error tiers with a fresh example").
   - **Build a study plan** ("make me a 5-day plan to master this domain").

Focus your questions on the trade-off being tested — when to use a hook vs a
prompt rule, sliding window vs progressive summary, batch vs real-time — not
just definitions.

## Disclaimer

This is an independent community resource. It is not affiliated with, endorsed
by, or sponsored by Anthropic. No exam questions are reproduced or paraphrased
from the official exam. Content is based on publicly available Anthropic
documentation and the official exam guide. Licensed CC BY 4.0.
