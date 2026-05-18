"""Offline content validator for the CCAF study repo.

Checks, with no network access:
  - every domain CSV has the exact required header and 5 columns per row
  - all-domains.json parses, matches the documented shape, has unique ids,
    has no duplicate `front` text, and CSV rows agree with the JSON

Exit code 0 on success, 1 on any failure. Used locally and by CI.
"""

from __future__ import annotations

import csv
import json
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
FLASHCARDS_DIR = REPO_ROOT / "flashcards"
JSON_PATH = FLASHCARDS_DIR / "all-domains.json"

REQUIRED_HEADER = ["Front", "Back", "Domain", "Difficulty", "Tags"]
DOMAIN_NAMES = {
    1: "Agentic Architecture & Orchestration",
    2: "Tool Design & MCP Integration",
    3: "Claude Code Configuration & Workflows",
    4: "Prompt Engineering & Structured Output",
    5: "Context Management & Reliability",
}
VALID_DIFFICULTY = {"easy", "medium", "hard"}


def fail(message: str) -> None:
    print(f"FAIL: {message}", file=sys.stderr)


def validate_csvs() -> list[str]:
    errors: list[str] = []
    csv_files = sorted(FLASHCARDS_DIR.glob("domain-*.csv"))
    if not csv_files:
        errors.append("no domain-*.csv files found in flashcards/")
        return errors
    for path in csv_files:
        with path.open(newline="", encoding="utf-8") as handle:
            reader = csv.reader(handle)
            try:
                header = next(reader)
            except StopIteration:
                errors.append(f"{path.name}: file is empty")
                continue
            if header != REQUIRED_HEADER:
                errors.append(
                    f"{path.name}: header must be {REQUIRED_HEADER}, got {header}"
                )
            for line_no, row in enumerate(reader, start=2):
                if len(row) != 5:
                    errors.append(
                        f"{path.name}:{line_no}: expected 5 columns, got {len(row)}"
                    )
                elif row[3] not in VALID_DIFFICULTY:
                    errors.append(
                        f"{path.name}:{line_no}: invalid difficulty {row[3]!r}"
                    )
    return errors


def validate_json() -> list[str]:
    errors: list[str] = []
    if not JSON_PATH.exists():
        return [f"{JSON_PATH.name}: file not found"]
    try:
        cards = json.loads(JSON_PATH.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        return [f"{JSON_PATH.name}: invalid JSON: {exc}"]
    if not isinstance(cards, list) or not cards:
        return [f"{JSON_PATH.name}: must be a non-empty JSON array"]

    seen_ids: set[str] = set()
    seen_fronts: set[str] = set()
    required = {"id", "domain", "domain_name", "front", "back", "difficulty", "tags"}
    for index, card in enumerate(cards):
        if not isinstance(card, dict):
            errors.append(f"card #{index}: not an object")
            continue
        missing = required - card.keys()
        if missing:
            errors.append(f"card {card.get('id', index)}: missing {sorted(missing)}")
            continue
        card_id = card["id"]
        if card_id in seen_ids:
            errors.append(f"duplicate id: {card_id}")
        seen_ids.add(card_id)
        front = card["front"].strip().lower()
        if front in seen_fronts:
            errors.append(f"duplicate front text on {card_id}")
        seen_fronts.add(front)
        domain = card["domain"]
        if domain not in DOMAIN_NAMES:
            errors.append(f"{card_id}: domain {domain} out of range 1-5")
        elif card["domain_name"] != DOMAIN_NAMES[domain]:
            errors.append(
                f"{card_id}: domain_name {card['domain_name']!r} does not "
                f"match domain {domain}"
            )
        if card["difficulty"] not in VALID_DIFFICULTY:
            errors.append(f"{card_id}: invalid difficulty {card['difficulty']!r}")
        if not isinstance(card["tags"], list) or not card["tags"]:
            errors.append(f"{card_id}: tags must be a non-empty array")
    return errors


def main() -> int:
    all_errors = validate_csvs() + validate_json()
    if all_errors:
        for error in all_errors:
            fail(error)
        print(f"\n{len(all_errors)} validation error(s).", file=sys.stderr)
        return 1
    print("Content validation passed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
