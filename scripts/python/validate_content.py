"""Offline content validator for the CCAF study repo.

Checks, with no network access:
  - every domain CSV has the exact required header and 5 columns per row
  - all-domains.json parses, matches the documented shape, has unique ids,
    has no duplicate `front` text, and CSV rows agree with the JSON
  - questions/all-questions.json parses, has exactly 50 items with the
    documented shape, the required per-domain distribution, valid scenarios,
    correctly ordered A-D options, and is byte-mirrored into the web app

Exit code 0 on success, 1 on any failure. Used locally and by CI.
"""

from __future__ import annotations

import csv
import json
import re
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
FLASHCARDS_DIR = REPO_ROOT / "flashcards"
JSON_PATH = FLASHCARDS_DIR / "all-domains.json"

QUESTIONS_PATH = REPO_ROOT / "questions" / "all-questions.json"
WEB_QUESTIONS_PATH = REPO_ROOT / "web" / "src" / "data" / "questions.json"

# The six official exam scenario titles, kept verbatim in sync with
# web/src/data/scenarios.ts (SCENARIOS[].title). Hardcoded so this validator
# stays dependency-free and offline.
SCENARIO_TITLES = {
    "Customer Support Resolution Agent",
    "Code Generation with Claude Code",
    "Multi-Agent Research System",
    "Developer Productivity with Claude",
    "Claude Code for Continuous Integration",
    "Structured Data Extraction",
}

QUESTION_ID_RE = re.compile(r"^q-d([1-5])-([0-9]{3})$")
EXPECTED_QUESTION_TOTAL = 50
EXPECTED_DOMAIN_COUNTS = {1: 14, 2: 9, 3: 10, 4: 10, 5: 7}
EXPECTED_OPTION_LABELS = ["A", "B", "C", "D"]
MIN_SCENARIO_USES = 6

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


def validate_questions() -> list[str]:
    errors: list[str] = []
    if not QUESTIONS_PATH.exists():
        return [f"{QUESTIONS_PATH.name}: file not found"]
    raw = QUESTIONS_PATH.read_text(encoding="utf-8")
    try:
        questions = json.loads(raw)
    except json.JSONDecodeError as exc:
        return [f"{QUESTIONS_PATH.name}: invalid JSON: {exc}"]

    if not isinstance(questions, list):
        return [f"{QUESTIONS_PATH.name}: must be a JSON array"]
    if len(questions) != EXPECTED_QUESTION_TOTAL:
        errors.append(
            f"{QUESTIONS_PATH.name}: expected {EXPECTED_QUESTION_TOTAL} "
            f"questions, got {len(questions)}"
        )

    # The web app must ship a byte-identical copy so build works without
    # the prebuild copier (same contract as flashcards.json).
    if not WEB_QUESTIONS_PATH.exists():
        errors.append(f"{WEB_QUESTIONS_PATH}: file not found")
    elif WEB_QUESTIONS_PATH.read_text(encoding="utf-8") != raw:
        errors.append(
            "web/src/data/questions.json does not byte-match "
            "questions/all-questions.json (run web/scripts/copy-bundles.mjs)"
        )

    required = {
        "id",
        "scenario",
        "domain",
        "stem",
        "options",
        "correct",
        "explanation",
        "tags",
    }
    seen_ids: set[str] = set()
    seen_stems: set[str] = set()
    domain_counts: dict[int, int] = {}
    scenario_counts: dict[str, int] = {}

    for index, q in enumerate(questions):
        if not isinstance(q, dict):
            errors.append(f"question #{index}: not an object")
            continue
        missing = required - q.keys()
        if missing:
            errors.append(
                f"question {q.get('id', index)}: missing {sorted(missing)}"
            )
            continue

        qid = q["id"]
        if qid in seen_ids:
            errors.append(f"duplicate id: {qid}")
        seen_ids.add(qid)

        match = QUESTION_ID_RE.match(qid) if isinstance(qid, str) else None
        if not match:
            errors.append(f"{qid}: id does not match ^q-d[1-5]-[0-9]{{3}}$")

        domain = q["domain"]
        if domain not in EXPECTED_DOMAIN_COUNTS:
            errors.append(f"{qid}: domain {domain} out of range 1-5")
        else:
            domain_counts[domain] = domain_counts.get(domain, 0) + 1
            if match and int(match.group(1)) != domain:
                errors.append(
                    f"{qid}: id domain digit does not match domain {domain}"
                )

        scenario = q["scenario"]
        if scenario not in SCENARIO_TITLES:
            errors.append(f"{qid}: scenario {scenario!r} is not an official title")
        else:
            scenario_counts[scenario] = scenario_counts.get(scenario, 0) + 1

        stem = q["stem"]
        if not isinstance(stem, str) or not stem.strip():
            errors.append(f"{qid}: stem must be a non-empty string")
        else:
            norm_stem = stem.strip().lower()
            if norm_stem in seen_stems:
                errors.append(f"duplicate stem text on {qid}")
            seen_stems.add(norm_stem)

        explanation = q["explanation"]
        if not isinstance(explanation, str) or not explanation.strip():
            errors.append(f"{qid}: explanation must be a non-empty string")

        options = q["options"]
        labels: list[str] = []
        if not isinstance(options, list) or len(options) != 4:
            errors.append(f"{qid}: options must be exactly 4 entries")
        else:
            for opt in options:
                if not isinstance(opt, dict):
                    errors.append(f"{qid}: option is not an object")
                    continue
                labels.append(opt.get("label"))
                text = opt.get("text")
                if not isinstance(text, str) or not text.strip():
                    errors.append(f"{qid}: option text must be a non-empty string")
            if labels != EXPECTED_OPTION_LABELS:
                errors.append(
                    f"{qid}: option labels must be exactly "
                    f"{EXPECTED_OPTION_LABELS} in order, got {labels}"
                )

        correct = q["correct"]
        if correct not in EXPECTED_OPTION_LABELS:
            errors.append(f"{qid}: correct {correct!r} must be one of A-D")
        elif labels and correct not in labels:
            errors.append(f"{qid}: correct {correct!r} names no existing option")

        tags = q["tags"]
        if not isinstance(tags, list) or not (1 <= len(tags) <= 4):
            errors.append(f"{qid}: tags must be an array of 1-4 entries")
        elif any(not isinstance(t, str) or not t.strip() for t in tags):
            errors.append(f"{qid}: tags must be non-empty strings")

    for domain, expected in EXPECTED_DOMAIN_COUNTS.items():
        actual = domain_counts.get(domain, 0)
        if actual != expected:
            errors.append(
                f"domain {domain}: expected {expected} questions, got {actual}"
            )

    for title in SCENARIO_TITLES:
        used = scenario_counts.get(title, 0)
        if used < MIN_SCENARIO_USES:
            errors.append(
                f"scenario {title!r}: used {used} times, "
                f"expected at least {MIN_SCENARIO_USES}"
            )

    return errors


def main() -> int:
    all_errors = validate_csvs() + validate_json() + validate_questions()
    if all_errors:
        for error in all_errors:
            fail(error)
        print(f"\n{len(all_errors)} validation error(s).", file=sys.stderr)
        return 1
    print("Content validation passed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
