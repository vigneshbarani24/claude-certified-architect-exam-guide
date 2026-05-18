"""Generate CCAF exam flashcards from the study guide using the Claude API.

This is the ONLY script in the project that makes network/API calls.

Workflow:
  1. Read ``guide/exam-preparation-guide.md``.
  2. Split it into labelled sections (``Domain X.Y`` headings plus
     ``Anti-Patterns`` / ``Scenario`` blocks).
  3. Call the Claude API per selected section to generate Q&A pairs.
  4. Deduplicate generated fronts against existing cards (normalized compare).
  5. Append new cards to the correct per-domain CSV.
  6. Rebuild ``flashcards/all-domains.json`` with stable ``dN-NNN`` ids.

Requires the ``ANTHROPIC_API_KEY`` environment variable.

CLI::

    python generate_flashcards.py --domain 1
    python generate_flashcards.py --all
    python generate_flashcards.py --section "1.3"
"""

from __future__ import annotations

import argparse
import csv
import json
import os
import re
import sys
from dataclasses import dataclass
from pathlib import Path

try:
    import anthropic
except ImportError:  # pragma: no cover - dependency guidance
    print(
        "The 'anthropic' package is required. Install with: "
        "pip install -r requirements.txt",
        file=sys.stderr,
    )
    raise SystemExit(1) from None

ROOT = Path(__file__).resolve().parent / ".." / ".."
GUIDE_FILE = ROOT / "guide" / "exam-preparation-guide.md"
FLASHCARDS_DIR = ROOT / "flashcards"
ALL_DOMAINS_FILE = FLASHCARDS_DIR / "all-domains.json"

MODEL_ID = "claude-sonnet-4-20250514"

DOMAIN_NAMES: dict[int, str] = {
    1: "Agentic Architecture & Orchestration",
    2: "Tool Design & MCP Integration",
    3: "Claude Code Configuration & Workflows",
    4: "Prompt Engineering & Structured Output",
    5: "Context Management & Reliability",
}

DOMAIN_SLUGS: dict[int, str] = {
    1: "domain-1-agentic-architecture",
    2: "domain-2-tool-design-mcp",
    3: "domain-3-claude-code-config",
    4: "domain-4-prompt-engineering",
    5: "domain-5-context-management",
}

CSV_HEADER = ["Front", "Back", "Domain", "Difficulty", "Tags"]

SYSTEM_PROMPT = (
    "You are generating flashcards for the Claude Certified Architect exam.\n"
    "For each section provided, generate concise Q&A pairs.\n"
    "Front: a precise exam-style question testing one concept.\n"
    "Back: the correct answer in 1-3 sentences maximum.\n"
    "Return JSON array only. No preamble."
)

VALID_DIFFICULTIES: tuple[str, ...] = ("easy", "medium", "hard")


@dataclass
class Section:
    """A labelled chunk of the study guide to feed to the model."""

    domain: int
    label: str
    content: str


@dataclass
class Card:
    """A flashcard prior to id assignment."""

    domain: int
    front: str
    back: str
    difficulty: str
    tags: list[str]


def normalize(text: str) -> str:
    """Normalize front text for dedupe: lowercase, collapse whitespace, strip punctuation."""
    lowered = text.lower().strip()
    no_punct = re.sub(r"[^\w\s]", "", lowered)
    return re.sub(r"\s+", " ", no_punct).strip()


def read_guide() -> str:
    """Read the study guide. Exits with code 1 if missing."""
    if not GUIDE_FILE.exists():
        print(f"Study guide not found: {GUIDE_FILE}", file=sys.stderr)
        sys.exit(1)
    return GUIDE_FILE.read_text(encoding="utf-8")


def _infer_domain(heading: str, current_domain: int) -> int:
    """Infer the domain number from a heading line."""
    match = re.search(r"domain\s+([1-5])", heading, re.IGNORECASE)
    if match:
        return int(match.group(1))
    return current_domain


def split_sections(markdown: str) -> list[Section]:
    """Split the guide into labelled sections.

    Recognises ``Domain X.Y`` headings and ``Anti-Patterns`` / ``Scenario``
    blocks. Each becomes a Section attributed to the enclosing domain.
    """
    lines = markdown.splitlines()
    sections: list[Section] = []
    current_domain = 0
    current_label = ""
    buffer: list[str] = []

    heading_re = re.compile(r"^(#{1,6})\s+(.*)$")
    domain_sub_re = re.compile(r"domain\s+([1-5])(?:\.(\d+))?", re.IGNORECASE)
    block_re = re.compile(r"(anti-?patterns?|scenario)", re.IGNORECASE)

    def flush() -> None:
        text = "\n".join(buffer).strip()
        if text and current_label and current_domain:
            sections.append(
                Section(
                    domain=current_domain,
                    label=current_label,
                    content=text,
                )
            )

    for line in lines:
        match = heading_re.match(line)
        if not match:
            buffer.append(line)
            continue

        heading_text = match.group(2).strip()
        is_domain = domain_sub_re.search(heading_text)
        is_block = block_re.search(heading_text)

        if is_domain or is_block:
            flush()
            buffer = []
            current_domain = _infer_domain(heading_text, current_domain)
            current_label = heading_text
        else:
            buffer.append(line)

    flush()
    return sections


def select_sections(
    sections: list[Section],
    *,
    domain: int | None,
    section_filter: str | None,
) -> list[Section]:
    """Filter sections by domain or by a ``X.Y`` section identifier."""
    selected = sections
    if domain is not None:
        selected = [s for s in selected if s.domain == domain]
    if section_filter is not None:
        target = section_filter.strip()
        selected = [
            s
            for s in selected
            if re.search(rf"\b{re.escape(target)}\b", s.label)
        ]
    return selected


def load_existing_cards() -> list[dict[str, object]]:
    """Load existing cards from all-domains.json (empty list if absent)."""
    if not ALL_DOMAINS_FILE.exists():
        return []
    try:
        data = json.loads(ALL_DOMAINS_FILE.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        print(f"Warning: all-domains.json is invalid JSON: {exc}", file=sys.stderr)
        return []
    return [c for c in data if isinstance(c, dict)] if isinstance(data, list) else []


def call_model(client: anthropic.Anthropic, section: Section) -> list[Card]:
    """Call the Claude API for one section and parse the returned cards."""
    user_content = (
        f"Domain {section.domain}: {DOMAIN_NAMES.get(section.domain, '')}\n"
        f"Section label: {section.label}\n\n"
        f"Section content:\n{section.content}\n\n"
        'Return a JSON array of objects with keys: "front", "back", '
        '"difficulty" (easy|medium|hard), "tags" (array of short strings).'
    )

    response = client.messages.create(
        model=MODEL_ID,
        max_tokens=4096,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": user_content}],
    )

    text_parts = [
        block.text for block in response.content if block.type == "text"
    ]
    raw = "".join(text_parts).strip()
    raw = re.sub(r"^```(?:json)?\s*|\s*```$", "", raw, flags=re.MULTILINE).strip()

    try:
        parsed = json.loads(raw)
    except json.JSONDecodeError as exc:
        print(
            f"Warning: model output for '{section.label}' was not valid "
            f"JSON ({exc}); skipping.",
            file=sys.stderr,
        )
        return []

    if not isinstance(parsed, list):
        print(
            f"Warning: model output for '{section.label}' was not a list; "
            "skipping.",
            file=sys.stderr,
        )
        return []

    cards: list[Card] = []
    for item in parsed:
        if not isinstance(item, dict):
            continue
        front = str(item.get("front", "")).strip()
        back = str(item.get("back", "")).strip()
        if not front or not back:
            continue
        difficulty = str(item.get("difficulty", "medium")).lower().strip()
        if difficulty not in VALID_DIFFICULTIES:
            difficulty = "medium"
        tags_raw = item.get("tags", [])
        if isinstance(tags_raw, list):
            tags = [str(t).strip() for t in tags_raw if str(t).strip()]
        else:
            tags = [t.strip() for t in str(tags_raw).split(",") if t.strip()]
        cards.append(
            Card(
                domain=section.domain,
                front=front,
                back=back,
                difficulty=difficulty,
                tags=tags,
            )
        )
    return cards


def domain_csv_path(domain: int) -> Path:
    """Path to the per-domain CSV file."""
    slug = DOMAIN_SLUGS.get(domain, f"domain-{domain}")
    return FLASHCARDS_DIR / f"{slug}.csv"


def read_domain_csv(domain: int) -> list[Card]:
    """Read existing cards from a domain CSV (empty if absent)."""
    path = domain_csv_path(domain)
    if not path.exists():
        return []
    cards: list[Card] = []
    with path.open(encoding="utf-8", newline="") as handle:
        reader = csv.DictReader(handle)
        for row in reader:
            tags = [
                t.strip()
                for t in str(row.get("Tags", "")).split(",")
                if t.strip()
            ]
            cards.append(
                Card(
                    domain=domain,
                    front=str(row.get("Front", "")).strip(),
                    back=str(row.get("Back", "")).strip(),
                    difficulty=str(row.get("Difficulty", "medium")).strip(),
                    tags=tags,
                )
            )
    return cards


def write_domain_csv(domain: int, cards: list[Card]) -> None:
    """Write the full set of cards for a domain to its CSV."""
    path = domain_csv_path(domain)
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.writer(handle)
        writer.writerow(CSV_HEADER)
        for card in cards:
            writer.writerow(
                [
                    card.front,
                    card.back,
                    card.domain,
                    card.difficulty,
                    ",".join(card.tags),
                ]
            )


def rebuild_all_domains() -> int:
    """Rebuild all-domains.json from the per-domain CSVs.

    Returns the total number of cards written.
    """
    out: list[dict[str, object]] = []
    for domain in sorted(DOMAIN_NAMES):
        cards = read_domain_csv(domain)
        for idx, card in enumerate(cards, start=1):
            out.append(
                {
                    "id": f"d{domain}-{idx:03d}",
                    "domain": domain,
                    "domain_name": DOMAIN_NAMES[domain],
                    "front": card.front,
                    "back": card.back,
                    "difficulty": card.difficulty,
                    "tags": card.tags,
                }
            )
    FLASHCARDS_DIR.mkdir(parents=True, exist_ok=True)
    ALL_DOMAINS_FILE.write_text(
        json.dumps(out, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )
    return len(out)


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    """Parse command-line arguments."""
    parser = argparse.ArgumentParser(
        description="Generate CCAF flashcards from the study guide via Claude.",
    )
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument(
        "--domain", type=int, choices=range(1, 6), metavar="{1-5}"
    )
    group.add_argument("--all", action="store_true")
    group.add_argument(
        "--section",
        type=str,
        help='Section identifier such as "1.3".',
    )
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    """Entry point. Returns a process exit code."""
    args = parse_args(argv)

    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        print(
            "ANTHROPIC_API_KEY environment variable is not set. "
            "Export it before running this script.",
            file=sys.stderr,
        )
        return 1

    markdown = read_guide()
    sections = split_sections(markdown)
    if not sections:
        print("No labelled sections found in the study guide.", file=sys.stderr)
        return 1

    domain = None if (args.all or args.section) else args.domain
    selected = select_sections(
        sections, domain=domain, section_filter=args.section
    )
    if not selected:
        print("No sections matched the given filter.", file=sys.stderr)
        return 1

    existing = load_existing_cards()
    seen_fronts: set[str] = {
        normalize(str(c.get("front", ""))) for c in existing
    }

    client = anthropic.Anthropic(api_key=api_key)

    added_per_domain: dict[int, list[Card]] = {}
    for section in selected:
        print(f"Generating for: {section.label} (domain {section.domain})...")
        try:
            generated = call_model(client, section)
        except anthropic.APIError as exc:
            print(f"API error for '{section.label}': {exc}", file=sys.stderr)
            continue

        for card in generated:
            key = normalize(card.front)
            if key in seen_fronts:
                continue
            seen_fronts.add(key)
            added_per_domain.setdefault(card.domain, []).append(card)

    if not added_per_domain:
        print("No new (non-duplicate) cards were generated.")
        return 0

    for domain_num, new_cards in added_per_domain.items():
        existing_cards = read_domain_csv(domain_num)
        combined = existing_cards + new_cards
        write_domain_csv(domain_num, combined)
        print(f"Domain {domain_num}: appended {len(new_cards)} new card(s).")

    total = rebuild_all_domains()
    print(f"Rebuilt all-domains.json with {total} total card(s).")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
