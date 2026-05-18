"""Build NotebookLM-ready markdown bundles from the guide and flashcards.

Fully offline. The study guide is organised into 13 topical chapters; each
exam domain maps to a set of those chapters. For each domain this packages:

  1. The full guide chapters relevant to that domain.
  2. Related flashcard Q&A pairs for that domain.
  3. The "Common Pitfalls" anti-pattern callouts from those chapters.
  4. The shared Exam Reasoning Checklist.

Outputs ``notebooklm/domain-0X-bundle.md`` per domain plus
``notebooklm/full-guide-bundle.md`` (entire guide + all flashcards).

Missing inputs are skipped with a logged note rather than failing.

CLI::

    python generate_notebooklm.py --domain 1
    python generate_notebooklm.py --all
"""

from __future__ import annotations

import argparse
import csv
import json
import logging
import re
import sys
from dataclasses import dataclass, field
from pathlib import Path

ROOT = Path(__file__).resolve().parent / ".." / ".."
GUIDE_FILE = ROOT / "guide" / "exam-preparation-guide.md"
FLASHCARDS_DIR = ROOT / "flashcards"
ALL_DOMAINS_FILE = FLASHCARDS_DIR / "all-domains.json"
OUTPUT_DIR = ROOT / "notebooklm"

DOMAIN_NAMES: dict[int, str] = {
    1: "Agentic Architecture & Orchestration",
    2: "Tool Design & MCP Integration",
    3: "Claude Code Configuration & Workflows",
    4: "Prompt Engineering & Structured Output",
    5: "Context Management & Reliability",
}

DOMAIN_SLUGS: dict[int, str] = {
    1: "domain-01-agentic-architecture",
    2: "domain-02-tool-design-mcp",
    3: "domain-03-claude-code-workflows",
    4: "domain-04-prompt-engineering",
    5: "domain-05-context-management",
}

# Guide chapter numbers most relevant to each exam domain. A chapter may serve
# more than one domain (the guide is topical; the exam is domain-weighted).
DOMAIN_CHAPTERS: dict[int, list[int]] = {
    1: [1, 8, 9],
    2: [2, 3, 7],
    3: [10, 11],
    4: [1, 4, 12, 6],
    5: [5, 6],
}

logging.basicConfig(
    level=logging.INFO, format="%(levelname)s: %(message)s", stream=sys.stderr
)
logger = logging.getLogger("generate_notebooklm")


@dataclass
class Chapter:
    """A top-level guide chapter and its extracted parts."""

    number: int
    title: str
    body: str
    pitfalls: str = ""


@dataclass
class Guide:
    """Parsed guide: chapters by number plus shared sections."""

    chapters: dict[int, Chapter] = field(default_factory=dict)
    reasoning_checklist: str = ""


def read_guide() -> str | None:
    """Read the study guide, or None if it is absent."""
    if not GUIDE_FILE.exists():
        logger.warning(
            "Study guide not found at %s; skipping guide content.", GUIDE_FILE
        )
        return None
    return GUIDE_FILE.read_text(encoding="utf-8")


def _split_top_sections(markdown: str) -> list[tuple[str, str]]:
    """Split markdown on level-2 (``## ``) headings into (heading, body)."""
    lines = markdown.splitlines()
    sections: list[tuple[str, str]] = []
    heading: str | None = None
    buffer: list[str] = []
    h2 = re.compile(r"^##\s+(.*)$")
    for line in lines:
        match = h2.match(line)
        if match:
            if heading is not None:
                sections.append((heading, "\n".join(buffer).strip()))
            heading = match.group(1).strip()
            buffer = []
        else:
            buffer.append(line)
    if heading is not None:
        sections.append((heading, "\n".join(buffer).strip()))
    return sections


def _extract_pitfalls(body: str) -> str:
    """Pull the ``### Common Pitfalls`` subsection text out of a chapter."""
    match = re.search(
        r"^###\s+Common Pitfalls\s*$(.*?)(?=^###\s|\Z)",
        body,
        re.MULTILINE | re.DOTALL,
    )
    return match.group(1).strip() if match else ""


def parse_guide(markdown: str) -> Guide:
    """Parse the guide into numbered chapters plus the reasoning checklist."""
    guide = Guide()
    chapter_re = re.compile(r"^(\d+)\.\s+(.*)$")
    for heading, body in _split_top_sections(markdown):
        chapter_match = chapter_re.match(heading)
        if chapter_match:
            number = int(chapter_match.group(1))
            guide.chapters[number] = Chapter(
                number=number,
                title=chapter_match.group(2).strip(),
                body=body,
                pitfalls=_extract_pitfalls(body),
            )
        elif heading.strip().lower() == "study strategy":
            checklist = re.search(
                r"###\s+Exam Reasoning Checklist\s*(.*?)(?=^###\s|\Z)",
                body,
                re.MULTILINE | re.DOTALL,
            )
            if checklist:
                guide.reasoning_checklist = checklist.group(1).strip()
    return guide


def load_flashcards() -> list[dict[str, object]]:
    """Load flashcards from all-domains.json or fall back to domain CSVs."""
    if ALL_DOMAINS_FILE.exists():
        try:
            data = json.loads(ALL_DOMAINS_FILE.read_text(encoding="utf-8"))
        except json.JSONDecodeError as exc:
            logger.warning("all-domains.json invalid (%s); trying CSVs.", exc)
        else:
            if isinstance(data, list):
                return [c for c in data if isinstance(c, dict)]

    cards: list[dict[str, object]] = []
    for domain, slug in DOMAIN_SLUGS.items():
        path = FLASHCARDS_DIR / f"{slug}.csv"
        if not path.exists():
            logger.info("Domain %d CSV missing (%s); skipping.", domain, path.name)
            continue
        with path.open(encoding="utf-8", newline="") as handle:
            for row in csv.DictReader(handle):
                cards.append(
                    {
                        "domain": domain,
                        "domain_name": DOMAIN_NAMES[domain],
                        "front": row.get("Front", ""),
                        "back": row.get("Back", ""),
                        "difficulty": row.get("Difficulty", ""),
                        "tags": [
                            t.strip()
                            for t in str(row.get("Tags", "")).split(",")
                            if t.strip()
                        ],
                    }
                )
    if not cards:
        logger.warning("No flashcard data found (no JSON and no CSVs).")
    return cards


def cards_for_domain(
    cards: list[dict[str, object]], domain: int
) -> list[dict[str, object]]:
    """Return flashcards belonging to a domain."""
    return [c for c in cards if c.get("domain") == domain]


def render_flashcards(cards: list[dict[str, object]]) -> str:
    """Render flashcards as a markdown Q&A list."""
    if not cards:
        return "_No flashcards available for this domain yet._\n"
    parts: list[str] = []
    for card in cards:
        front = str(card.get("front", "")).strip()
        back = str(card.get("back", "")).strip()
        difficulty = str(card.get("difficulty", "")).strip()
        tags = card.get("tags", [])
        tag_str = ", ".join(tags) if isinstance(tags, list) else str(tags)
        parts.append(
            f"**Q:** {front}\n\n"
            f"**A:** {back}\n\n"
            f"_(difficulty: {difficulty or 'n/a'}; tags: {tag_str or 'none'})_\n"
        )
    return "\n---\n\n".join(parts) + "\n"


def build_domain_bundle(
    domain: int,
    guide: Guide,
    cards: list[dict[str, object]],
) -> str:
    """Assemble the markdown bundle for one domain."""
    name = DOMAIN_NAMES[domain]
    out: list[str] = [
        f"# NotebookLM Bundle — Domain {domain}: {name}",
        "",
        "_Generated study bundle for the Claude Certified Architect (CCAF) "
        "exam. Offline build from the project study guide and flashcards. "
        "Not affiliated with Anthropic. Licensed CC BY 4.0._",
        "",
        "## 1. Guide Sections",
        "",
    ]

    chapter_numbers = DOMAIN_CHAPTERS.get(domain, [])
    present = [n for n in chapter_numbers if n in guide.chapters]
    if present:
        for number in present:
            chapter = guide.chapters[number]
            out.append(f"### {chapter.number}. {chapter.title}")
            out.append("")
            out.append(chapter.body or "_(no content)_")
            out.append("")
    else:
        out.append("_Guide section content not available._")
        out.append("")

    out.append("## 2. Flashcards")
    out.append("")
    out.append(render_flashcards(cards_for_domain(cards, domain)))

    out.append("## 3. Anti-Patterns and Common Pitfalls")
    out.append("")
    pitfalls = [
        (guide.chapters[n].title, guide.chapters[n].pitfalls)
        for n in present
        if guide.chapters[n].pitfalls
    ]
    if pitfalls:
        for title, text in pitfalls:
            out.append(f"### Pitfalls — {title}")
            out.append("")
            out.append(text)
            out.append("")
    else:
        out.append("_No Common Pitfalls callouts found for these chapters._")
        out.append("")

    out.append("## 4. Exam Reasoning Checklist")
    out.append("")
    out.append(
        guide.reasoning_checklist
        or "_Reasoning checklist not available; see the full guide._"
    )
    out.append("")

    return "\n".join(out).rstrip() + "\n"


def build_full_bundle(
    markdown: str | None, cards: list[dict[str, object]]
) -> str:
    """Assemble the full-guide bundle (entire guide + all flashcards)."""
    out: list[str] = [
        "# NotebookLM Bundle — Full Guide + All Flashcards",
        "",
        "_Complete offline study bundle for the Claude Certified Architect "
        "(CCAF) exam. Not affiliated with Anthropic. Licensed CC BY 4.0._",
        "",
        "## Study Guide",
        "",
    ]
    out.append(markdown if markdown else "_Study guide not available._")
    out.append("")
    out.append("## All Flashcards by Domain")
    out.append("")
    for domain in sorted(DOMAIN_NAMES):
        out.append(f"### Domain {domain}: {DOMAIN_NAMES[domain]}")
        out.append("")
        out.append(render_flashcards(cards_for_domain(cards, domain)))
        out.append("")
    return "\n".join(out).rstrip() + "\n"


def write_output(path: Path, content: str) -> None:
    """Write a bundle to disk, creating the output directory."""
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")
    logger.info("Wrote %s", path)


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    """Parse command-line arguments."""
    parser = argparse.ArgumentParser(
        description="Build offline NotebookLM markdown bundles.",
    )
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument(
        "--domain", type=int, choices=range(1, 6), metavar="{1-5}"
    )
    group.add_argument("--all", action="store_true")
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    """Entry point. Returns a process exit code."""
    args = parse_args(argv)

    markdown = read_guide()
    guide = parse_guide(markdown) if markdown else Guide()
    cards = load_flashcards()

    if args.all:
        for domain in sorted(DOMAIN_NAMES):
            write_output(
                OUTPUT_DIR / f"domain-{domain:02d}-bundle.md",
                build_domain_bundle(domain, guide, cards),
            )
        write_output(
            OUTPUT_DIR / "full-guide-bundle.md",
            build_full_bundle(markdown, cards),
        )
    else:
        domain = args.domain
        write_output(
            OUTPUT_DIR / f"domain-{domain:02d}-bundle.md",
            build_domain_bundle(domain, guide, cards),
        )

    logger.info("Done.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
