"""Offline CLI quiz runner for the Claude Certified Architect (CCAF) exam.

Loads flashcards from ``flashcards/all-domains.json`` and runs an interactive,
fully offline self-graded quiz session. No API calls are made.

Usage examples::

    python quiz.py --domain 1
    python quiz.py --all
    python quiz.py --domain 3 --difficulty hard
    python quiz.py --all --shuffle
"""

from __future__ import annotations

import argparse
import json
import random
import sys
from dataclasses import dataclass, field
from pathlib import Path

from rich.console import Console
from rich.panel import Panel
from rich.table import Table

DATA_FILE = Path(__file__).resolve().parent / ".." / ".." / "flashcards" / "all-domains.json"

DOMAIN_NAMES: dict[int, str] = {
    1: "Agentic Architecture & Orchestration",
    2: "Tool Design & MCP Integration",
    3: "Claude Code Configuration & Workflows",
    4: "Prompt Engineering & Structured Output",
    5: "Context Management & Reliability",
}

VALID_DIFFICULTIES: tuple[str, ...] = ("easy", "medium", "hard")

console = Console()


@dataclass
class DomainScore:
    """Mutable per-domain tally for a quiz session."""

    correct: int = 0
    incorrect: int = 0

    @property
    def total(self) -> int:
        return self.correct + self.incorrect

    @property
    def accuracy(self) -> float:
        if self.total == 0:
            return 0.0
        return (self.correct / self.total) * 100.0


@dataclass
class Session:
    """Aggregate session state."""

    scores: dict[int, DomainScore] = field(default_factory=dict)

    def record(self, domain: int, *, was_correct: bool) -> None:
        score = self.scores.setdefault(domain, DomainScore())
        if was_correct:
            score.correct += 1
        else:
            score.incorrect += 1

    @property
    def answered(self) -> int:
        return sum(s.total for s in self.scores.values())


def load_cards(path: Path) -> list[dict[str, object]]:
    """Load and validate flashcards from ``path``.

    Exits the process with code 1 on missing, empty, or malformed data.
    """
    if not path.exists():
        console.print(
            Panel(
                f"Flashcard data file not found:\n[bold]{path}[/bold]\n\n"
                "Generate it first (see scripts/README.md).",
                title="No data",
                border_style="red",
            )
        )
        sys.exit(1)

    try:
        raw = path.read_text(encoding="utf-8")
    except OSError as exc:
        console.print(f"[red]Could not read data file: {exc}[/red]")
        sys.exit(1)

    try:
        data = json.loads(raw)
    except json.JSONDecodeError as exc:
        console.print(f"[red]Data file is not valid JSON: {exc}[/red]")
        sys.exit(1)

    if not isinstance(data, list) or len(data) == 0:
        console.print(
            Panel(
                "The flashcard data file is empty or not a JSON array. "
                "Nothing to quiz on.",
                title="Empty data",
                border_style="red",
            )
        )
        sys.exit(1)

    cards: list[dict[str, object]] = [c for c in data if isinstance(c, dict)]
    if not cards:
        console.print("[red]No valid card objects found in data file.[/red]")
        sys.exit(1)
    return cards


def filter_cards(
    cards: list[dict[str, object]],
    *,
    domain: int | None,
    difficulty: str | None,
) -> list[dict[str, object]]:
    """Return cards matching the optional domain and difficulty filters."""
    selected = cards
    if domain is not None:
        selected = [c for c in selected if c.get("domain") == domain]
    if difficulty is not None:
        selected = [
            c
            for c in selected
            if str(c.get("difficulty", "")).lower() == difficulty
        ]
    return selected


def domain_label(domain: int) -> str:
    """Human-readable label for a domain number."""
    return DOMAIN_NAMES.get(domain, f"Domain {domain}")


def prompt_yes_no(message: str) -> bool:
    """Prompt for a yes/no answer. Defaults to 'no' on empty input."""
    while True:
        answer = console.input(message).strip().lower()
        if answer in ("y", "yes"):
            return True
        if answer in ("n", "no", ""):
            return False
        console.print("[yellow]Please answer y or n.[/yellow]")


def run_quiz(cards: list[dict[str, object]], session: Session) -> None:
    """Run the interactive quiz loop over ``cards``."""
    total = len(cards)
    for index, card in enumerate(cards, start=1):
        domain_raw = card.get("domain")
        domain = domain_raw if isinstance(domain_raw, int) else 0
        front = str(card.get("front", "(missing question)"))
        back = str(card.get("back", "(missing answer)"))
        difficulty = str(card.get("difficulty", "?"))

        console.print(
            Panel(
                front,
                title=f"[bold cyan]Q {index}/{total}[/bold cyan] "
                f"· {domain_label(domain)} · [magenta]{difficulty}[/magenta]",
                border_style="cyan",
            )
        )
        console.input("[dim]Press Enter to reveal the answer...[/dim]")
        console.print(
            Panel(back, title="[bold green]Answer[/bold green]", border_style="green")
        )

        was_correct = prompt_yes_no("[bold]Did you get it right? [y/N] [/bold]")
        session.record(domain, was_correct=was_correct)
        if was_correct:
            console.print("[green]Correct[/green]\n")
        else:
            console.print("[red]Marked incorrect[/red]\n")


def print_summary(session: Session) -> None:
    """Print a weak-area summary sorted weakest-first."""
    if session.answered == 0:
        console.print("[yellow]No questions answered — no summary.[/yellow]")
        return

    table = Table(title="Weak-Area Summary (weakest first)")
    table.add_column("Domain", style="cyan", no_wrap=False)
    table.add_column("Correct", justify="right", style="green")
    table.add_column("Incorrect", justify="right", style="red")
    table.add_column("Accuracy", justify="right", style="bold")

    ordered = sorted(
        session.scores.items(),
        key=lambda kv: (kv[1].accuracy, -kv[1].total),
    )

    overall_correct = 0
    overall_total = 0
    for domain, score in ordered:
        overall_correct += score.correct
        overall_total += score.total
        if score.accuracy >= 80:
            acc_style = "green"
        elif score.accuracy >= 50:
            acc_style = "yellow"
        else:
            acc_style = "red"
        table.add_row(
            f"{domain}. {domain_label(domain)}",
            str(score.correct),
            str(score.incorrect),
            f"[{acc_style}]{score.accuracy:.0f}%[/{acc_style}]",
        )

    overall_acc = (
        (overall_correct / overall_total) * 100.0 if overall_total else 0.0
    )
    table.add_section()
    table.add_row(
        "[bold]Overall[/bold]",
        f"[bold]{overall_correct}[/bold]",
        f"[bold]{overall_total - overall_correct}[/bold]",
        f"[bold]{overall_acc:.0f}%[/bold]",
    )
    console.print(table)


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    """Parse command-line arguments."""
    parser = argparse.ArgumentParser(
        description="Offline CCAF exam flashcard quiz runner.",
    )
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument(
        "--domain",
        type=int,
        choices=range(1, 6),
        metavar="{1-5}",
        help="Quiz a single domain (1-5).",
    )
    group.add_argument(
        "--all",
        action="store_true",
        help="Quiz all domains.",
    )
    parser.add_argument(
        "--difficulty",
        choices=VALID_DIFFICULTIES,
        help="Restrict to a difficulty level.",
    )
    parser.add_argument(
        "--shuffle",
        action="store_true",
        help="Shuffle the question order.",
    )
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    """Entry point. Returns a process exit code."""
    args = parse_args(argv)
    cards = load_cards(DATA_FILE)

    domain: int | None = None if args.all else args.domain
    selected = filter_cards(cards, domain=domain, difficulty=args.difficulty)

    if not selected:
        scope = "all domains" if args.all else f"domain {args.domain}"
        extra = f" with difficulty '{args.difficulty}'" if args.difficulty else ""
        console.print(
            Panel(
                f"No cards found for {scope}{extra}.",
                title="Nothing to quiz",
                border_style="yellow",
            )
        )
        return 1

    if args.shuffle:
        random.shuffle(selected)

    session = Session()
    console.print(
        Panel(
            f"Starting quiz: [bold]{len(selected)}[/bold] cards. "
            "Press Ctrl-C any time to stop and see your partial summary.",
            title="CCAF Quiz",
            border_style="blue",
        )
    )

    try:
        run_quiz(selected, session)
    except (KeyboardInterrupt, EOFError):
        console.print("\n[yellow]Session interrupted — partial summary:[/yellow]")
        print_summary(session)
        return 0

    print_summary(session)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
