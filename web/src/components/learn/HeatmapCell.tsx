"use client";

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

const BUCKET_CLASSES = [
  "bg-secondary",
  "bg-claude-orange/20",
  "bg-claude-orange/40",
  "bg-claude-orange/70",
  "bg-claude-orange",
] as const;

/** xpEarned → bucket 0..4. */
export function xpBucket(xp: number): number {
  if (xp <= 0) return 0;
  if (xp < 25) return 1;
  if (xp < 75) return 2;
  if (xp < 200) return 3;
  return 4;
}

interface HeatmapCellProps {
  dateISO: string;
  xp: number;
  cards: number;
  questions: number;
  sections: number;
}

export function HeatmapCell({
  dateISO,
  xp,
  cards,
  questions,
  sections,
}: HeatmapCellProps) {
  const bucket = xpBucket(xp);
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          className={cn(
            "h-3 w-3 rounded-[2px] sm:h-3.5 sm:w-3.5",
            BUCKET_CLASSES[bucket]
          )}
          aria-label={`${dateISO}: ${xp} XP`}
        />
      </TooltipTrigger>
      <TooltipContent>
        <div className="font-mono">
          <div className="text-foreground">{dateISO}</div>
          <div className="text-claude-orange">{xp} XP</div>
          <div className="text-claude-muted">
            {cards} cards · {questions} questions · {sections} sections
          </div>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
