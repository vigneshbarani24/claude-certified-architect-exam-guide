"use client";

import { Flame } from "lucide-react";

import type { Flashcard } from "@/lib/flashcards";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface FlashCardProps {
  card: Flashcard;
  flipped: boolean;
  onFlip: () => void;
  onMarkHard: () => void;
  isHard: boolean;
}

export function FlashCard({
  card,
  flipped,
  onFlip,
  onMarkHard,
  isHard,
}: FlashCardProps) {
  return (
    <div className="card-scene h-[22rem] w-full">
      <div className={cn("card-inner", flipped && "flipped")}>
        {/* FRONT */}
        <button
          type="button"
          onClick={onFlip}
          className="card-front flex flex-col rounded-lg border border-border bg-card p-6 text-left"
        >
          <div className="flex items-center justify-between">
            <Badge variant="outline">D{card.domain}</Badge>
            <Badge
              variant={
                card.difficulty === "hard"
                  ? "destructive"
                  : card.difficulty === "medium"
                    ? "secondary"
                    : "default"
              }
            >
              {card.difficulty}
            </Badge>
          </div>
          <div className="flex flex-1 items-center justify-center px-2">
            <p className="text-center text-lg font-medium leading-relaxed">
              {card.front}
            </p>
          </div>
          <p className="text-center font-mono text-xs text-claude-muted">
            Click or press Space to flip
          </p>
        </button>

        {/* BACK */}
        <div className="card-back flex flex-col rounded-lg border border-claude-orange/40 bg-card p-6">
          <button
            type="button"
            onClick={onFlip}
            className="flex flex-1 items-center justify-center overflow-y-auto px-2 text-left"
          >
            <p className="text-base leading-relaxed text-foreground">
              {card.back}
            </p>
          </button>
          <div className="mt-4 flex items-center justify-between">
            <span className="font-mono text-xs text-claude-muted">
              {card.domain_name}
            </span>
            <Button
              variant={isHard ? "default" : "outline"}
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onMarkHard();
              }}
            >
              <Flame className="h-4 w-4" />
              {isHard ? "Marked Hard" : "Hard"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
