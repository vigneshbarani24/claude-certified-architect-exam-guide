"use client";

import { useEffect, useRef, useState } from "react";
import { Pause, Play, Timer } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ExamTimerProps {
  minutes?: number;
  onExpire?: () => void;
}

export function ExamTimer({ minutes = 30, onExpire }: ExamTimerProps) {
  const [remaining, setRemaining] = useState(minutes * 60);
  const [running, setRunning] = useState(true);
  const expiredRef = useRef(false);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      setRemaining((r) => (r > 0 ? r - 1 : 0));
    }, 1000);
    return () => clearInterval(id);
  }, [running]);

  useEffect(() => {
    if (remaining === 0 && !expiredRef.current) {
      expiredRef.current = true;
      setRunning(false);
      onExpire?.();
    }
  }, [remaining, onExpire]);

  const mm = String(Math.floor(remaining / 60)).padStart(2, "0");
  const ss = String(remaining % 60).padStart(2, "0");
  const low = remaining <= 60;

  return (
    <div className="flex items-center gap-2">
      <div
        className={cn(
          "flex items-center gap-2 rounded-md border border-border bg-card px-3 py-1.5 font-mono text-sm tabular-nums",
          low ? "text-destructive" : "text-foreground"
        )}
      >
        <Timer className="h-4 w-4" />
        <span>
          {mm}:{ss}
        </span>
      </div>
      <Button
        variant="outline"
        size="icon"
        className="h-9 w-9"
        onClick={() => setRunning((v) => !v)}
        aria-label={running ? "Pause timer" : "Resume timer"}
        disabled={remaining === 0}
      >
        {running ? (
          <Pause className="h-4 w-4" />
        ) : (
          <Play className="h-4 w-4" />
        )}
      </Button>
    </div>
  );
}
