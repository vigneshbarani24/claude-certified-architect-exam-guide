"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, RefreshCw, RotateCcw } from "lucide-react";

import type { Flashcard } from "@/lib/flashcards";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FlashCard } from "./FlashCard";

interface DrillModeProps {
  deck: Flashcard[];
}

export function DrillMode({ deck }: DrillModeProps) {
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [hardIds, setHardIds] = useState<Set<string>>(new Set());
  const [finished, setFinished] = useState(false);
  const [seen, setSeen] = useState<Set<string>>(new Set());

  const total = deck.length;

  // Reset when the deck changes (filters applied upstream).
  useEffect(() => {
    setIndex(0);
    setFlipped(false);
    setHardIds(new Set());
    setSeen(new Set());
    setFinished(false);
  }, [deck]);

  const markSeen = useCallback((id: string) => {
    setSeen((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  }, []);

  const go = useCallback(
    (dir: 1 | -1) => {
      if (total === 0) return;
      setFlipped(false);
      setIndex((i) => {
        const card = deck[i];
        if (card) markSeen(card.id);
        const ni = i + dir;
        if (ni >= total) {
          setFinished(true);
          return i;
        }
        if (ni < 0) return 0;
        return ni;
      });
    },
    [deck, total, markSeen]
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
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [flip, go, finished]);

  const restart = () => {
    setIndex(0);
    setFlipped(false);
    setHardIds(new Set());
    setSeen(new Set());
    setFinished(false);
  };

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
        <span className="font-mono text-xs text-claude-muted">
          {hardIds.size} marked hard
        </span>
      </div>

      <FlashCard
        card={card}
        flipped={flipped}
        onFlip={flip}
        onMarkHard={toggleHard}
        isHard={hardIds.has(card.id)}
      />

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
        Shortcuts: Space flip · ← prev · → next
      </p>
    </div>
  );
}
