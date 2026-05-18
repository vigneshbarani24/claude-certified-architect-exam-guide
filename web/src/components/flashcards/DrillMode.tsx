"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, RefreshCw, RotateCcw } from "lucide-react";

import type { Flashcard } from "@/lib/flashcards";
import type { ResumeState } from "@/lib/progress";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useProgress } from "@/components/progress/XpProvider";
import { FlashCard } from "./FlashCard";

/** Filter context passed from /flashcards so we can persist resume state. */
type FilterMeta = NonNullable<ResumeState["drill"]>;

interface DrillModeProps {
  deck: Flashcard[];
  /** Optional starting index (from a resumed deep link). */
  initialIndex?: number;
  /** Optional filter context; when present we persist resume state. */
  filterMeta?: Omit<FilterMeta, "index">;
}

export function DrillMode({
  deck,
  initialIndex = 0,
  filterMeta,
}: DrillModeProps) {
  const [index, setIndex] = useState(initialIndex);
  const [flipped, setFlipped] = useState(false);
  const [hardIds, setHardIds] = useState<Set<string>>(new Set());
  const [finished, setFinished] = useState(false);
  const [seen, setSeen] = useState<Set<string>>(new Set());
  const [sessionXp, setSessionXp] = useState(0);
  const [xpFlash, setXpFlash] = useState<string | null>(null);
  const flashTimer = useRef<number | null>(null);
  const sessionStartBadges = useRef<Set<string>>(new Set());

  const {
    flashcardReviewed,
    flashcardCorrect,
    srsRate,
    recordResumeDrill,
    snapshot,
    mounted,
  } = useProgress();

  const total = deck.length;

  const showXp = useCallback((amount: number, label: string) => {
    if (amount <= 0) return;
    setSessionXp((x) => x + amount);
    setXpFlash(`+${amount} XP · ${label}`);
    if (flashTimer.current) window.clearTimeout(flashTimer.current);
    flashTimer.current = window.setTimeout(() => setXpFlash(null), 1400);
  }, []);

  // Reset when the deck changes (filters applied upstream).
  useEffect(() => {
    setIndex(initialIndex);
    setFlipped(false);
    setHardIds(new Set());
    setSeen(new Set());
    setFinished(false);
    setSessionXp(0);
    setXpFlash(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deck]);

  // Persist resume state on card change and on unmount (if filterMeta given).
  const filterMetaRef = useRef(filterMeta);
  filterMetaRef.current = filterMeta;
  const indexRef = useRef(index);
  indexRef.current = index;

  useEffect(() => {
    const fm = filterMeta;
    if (!fm) return;
    recordResumeDrill({ ...fm, index });
  }, [index, filterMeta, recordResumeDrill]);

  useEffect(() => {
    return () => {
      const fm = filterMetaRef.current;
      if (!fm) return;
      recordResumeDrill({ ...fm, index: indexRef.current });
    };
  }, [recordResumeDrill]);

  // Snapshot the badges the user already has when a session begins, so we
  // can surface only newly unlocked badges in the summary.
  useEffect(() => {
    if (mounted) {
      sessionStartBadges.current = new Set(
        snapshot.badges.map((b) => b.id)
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deck, mounted]);

  const markSeen = useCallback(
    (id: string) => {
      setSeen((prev) => {
        if (prev.has(id)) return prev;
        const next = new Set(prev);
        next.add(id);
        return next;
      });
      const earned = flashcardReviewed(id);
      if (earned > 0) showXp(earned, "card reviewed");
    },
    [flashcardReviewed, showXp]
  );

  const go = useCallback(
    (dir: 1 | -1) => {
      if (total === 0) return;
      // Navigation no longer auto-marks "correct" — the explicit Good
      // button owns the self-mark. We still record the card as seen.
      const card = deck[index];
      if (card) markSeen(card.id);
      setFlipped(false);
      setIndex((i) => {
        const ni = i + dir;
        if (ni >= total) {
          setFinished(true);
          return i;
        }
        if (ni < 0) return 0;
        return ni;
      });
    },
    [deck, index, total, markSeen]
  );

  // Explicit spaced-repetition ratings (shown once the card is flipped).
  const rate = useCallback(
    (rating: "again" | "hard" | "good") => {
      const card = deck[index];
      if (!card) return;
      markSeen(card.id);
      srsRate(card.id, rating);
      if (rating === "good") {
        const earned = flashcardCorrect(card.id);
        if (earned > 0) showXp(earned, "knew it");
      } else if (rating === "hard") {
        setHardIds((prev) => {
          if (prev.has(card.id)) return prev;
          const next = new Set(prev);
          next.add(card.id);
          return next;
        });
      }
      go(1);
    },
    [deck, index, markSeen, srsRate, flashcardCorrect, showXp, go]
  );

  const flip = useCallback(() => {
    const card = deck[index];
    if (card) markSeen(card.id);
    setFlipped((f) => !f);
  }, [deck, index, markSeen]);

  const toggleHard = useCallback(() => {
    const card = deck[index];
    if (!card) return;
    setHardIds((prev) => {
      const next = new Set(prev);
      if (next.has(card.id)) next.delete(card.id);
      else next.add(card.id);
      return next;
    });
  }, [deck, index]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (finished) return;
      if (e.code === "Space") {
        e.preventDefault();
        flip();
      } else if (e.code === "ArrowRight") {
        e.preventDefault();
        go(1);
      } else if (e.code === "ArrowLeft") {
        e.preventDefault();
        go(-1);
      } else if (flipped && (e.code === "Digit1" || e.code === "Numpad1")) {
        e.preventDefault();
        rate("again");
      } else if (flipped && (e.code === "Digit2" || e.code === "Numpad2")) {
        e.preventDefault();
        rate("hard");
      } else if (flipped && (e.code === "Digit3" || e.code === "Numpad3")) {
        e.preventDefault();
        rate("good");
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [flip, go, rate, flipped, finished]);

  const restart = () => {
    setIndex(initialIndex);
    setFlipped(false);
    setHardIds(new Set());
    setSeen(new Set());
    setFinished(false);
    setSessionXp(0);
    setXpFlash(null);
    sessionStartBadges.current = new Set(snapshot.badges.map((b) => b.id));
  };

  const newBadges = snapshot.badges.filter(
    (b) => !sessionStartBadges.current.has(b.id)
  );

  if (total === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          No cards match the current filters.
        </CardContent>
      </Card>
    );
  }

  if (finished) {
    return (
      <Card className="mx-auto max-w-xl">
        <CardContent className="space-y-5 py-10 text-center">
          <h2 className="font-display text-3xl">Session complete</h2>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <div className="font-mono text-2xl text-claude-orange">
                {total}
              </div>
              <div className="text-xs text-muted-foreground">Cards</div>
            </div>
            <div>
              <div className="font-mono text-2xl text-claude-orange">
                {seen.size}
              </div>
              <div className="text-xs text-muted-foreground">Reviewed</div>
            </div>
            <div>
              <div className="font-mono text-2xl text-destructive">
                {hardIds.size}
              </div>
              <div className="text-xs text-muted-foreground">Marked hard</div>
            </div>
          </div>

          <div className="rounded-md border border-claude-orange/40 bg-claude-orange/5 p-4">
            <div className="font-mono text-2xl text-claude-orange">
              +{sessionXp} XP
            </div>
            <div className="text-xs text-muted-foreground">
              earned this session · {snapshot.rank.name} ·{" "}
              {snapshot.xp.toLocaleString()} XP total
            </div>
          </div>

          {newBadges.length > 0 && (
            <div className="space-y-2">
              <p className="font-mono text-xs uppercase tracking-wider text-claude-muted">
                New badge{newBadges.length > 1 ? "s" : ""} unlocked
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                {newBadges.map((b) => (
                  <span
                    key={b.id}
                    className="rounded-md border border-claude-orange px-3 py-1 font-mono text-xs text-claude-orange"
                  >
                    {b.label}
                  </span>
                ))}
              </div>
            </div>
          )}

          <Button onClick={restart}>
            <RotateCcw className="h-4 w-4" />
            Restart deck
          </Button>
        </CardContent>
      </Card>
    );
  }

  const card = deck[index];

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div className="flex items-center justify-between">
        <span className="font-mono text-sm text-muted-foreground">
          {index + 1} / {total}
        </span>
        <div className="flex items-center gap-3">
          {xpFlash && (
            <span className="animate-in fade-in font-mono text-xs text-claude-orange">
              {xpFlash}
            </span>
          )}
          <span className="font-mono text-xs text-claude-muted">
            {hardIds.size} marked hard
          </span>
        </div>
      </div>

      <FlashCard
        card={card}
        flipped={flipped}
        onFlip={flip}
        onMarkHard={toggleHard}
        isHard={hardIds.has(card.id)}
      />

      {flipped && (
        <div className="flex items-center justify-center gap-3">
          <Button
            variant="outline"
            className="border-destructive/50 text-destructive hover:bg-destructive/10"
            onClick={() => rate("again")}
          >
            Again
            <span className="ml-1 font-mono text-xs opacity-60">1</span>
          </Button>
          <Button
            variant="outline"
            onClick={() => rate("hard")}
          >
            Hard
            <span className="ml-1 font-mono text-xs opacity-60">2</span>
          </Button>
          <Button onClick={() => rate("good")}>
            Good
            <span className="ml-1 font-mono text-xs opacity-60">3</span>
          </Button>
        </div>
      )}

      <div className="flex items-center justify-center gap-3">
        <Button
          variant="outline"
          onClick={() => go(-1)}
          disabled={index === 0}
        >
          <ChevronLeft className="h-4 w-4" />
          Prev
        </Button>
        <Button variant="secondary" onClick={flip}>
          <RefreshCw className="h-4 w-4" />
          Flip
        </Button>
        <Button onClick={() => go(1)}>
          {index === total - 1 ? "Finish" : "Next"}
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <p className="text-center font-mono text-xs text-claude-muted">
        Shortcuts: Space flip · ← prev · → next · when flipped 1 again · 2
        hard · 3 good
      </p>
    </div>
  );
}
