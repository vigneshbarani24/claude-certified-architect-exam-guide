"use client";

import { useEffect, useState } from "react";
import { Github } from "lucide-react";

import { getAllFlashcards } from "@/lib/flashcards";
import { getAllQuestions } from "@/lib/questions";
import { SCENARIOS } from "@/data/scenarios";
import { GUIDE_CHAPTER_DOMAIN } from "@/lib/learn";
import { REPO_URL } from "@/lib/site";
import siteStats from "@/data/site-stats.json";
import { useInView } from "./useInView";

interface Stat {
  value: number;
  suffix?: string;
  label: string;
}

// Real numbers, read from the data wherever possible so they never drift.
const FLASHCARD_COUNT = getAllFlashcards().length;
const QUESTION_COUNT = getAllQuestions().length;
// 12 mapped chapters + the Quick Reference cheat sheet (ch.13) = 13.
const CHAPTER_COUNT = Object.keys(GUIDE_CHAPTER_DOMAIN).length + 1;
const SCENARIO_COUNT = SCENARIOS.length;

const STATS: Stat[] = [
  { value: 5, label: "Exam domains" },
  { value: CHAPTER_COUNT, label: "Guide chapters" },
  { value: FLASHCARD_COUNT, label: "Flashcards" },
  { value: QUESTION_COUNT, label: "Practice questions" },
  { value: SCENARIO_COUNT, label: "Exam scenarios" },
];

const STARS: number | null =
  typeof siteStats.stars === "number" ? siteStats.stars : null;

function CountUp({
  to,
  run,
  suffix,
}: {
  to: number;
  run: boolean;
  suffix?: string;
}) {
  const [n, setN] = useState(0);

  useEffect(() => {
    if (!run) return;
    let raf = 0;
    const start = performance.now();
    const duration = 900;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      // easeOutCubic
      const eased = 1 - Math.pow(1 - t, 3);
      setN(Math.round(eased * to));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [run, to]);

  return (
    <span>
      {run ? n : 0}
      {suffix ?? ""}
    </span>
  );
}

export function StatStrip() {
  const { ref, inView } = useInView<HTMLDivElement>();

  return (
    <section className="rounded-lg border border-border bg-card" ref={ref}>
      <div className="grid grid-cols-2 divide-x divide-y divide-border sm:grid-cols-3 sm:divide-y-0 lg:grid-cols-6">
        {STATS.map((s) => (
          <div key={s.label} className="p-6 text-center">
            <div className="font-display text-3xl text-claude-orange">
              <CountUp to={s.value} run={inView} suffix={s.suffix} />
            </div>
            <div className="mt-1 font-mono text-xs uppercase tracking-wider text-claude-muted">
              {s.label}
            </div>
          </div>
        ))}
        <a
          href={REPO_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="group flex flex-col items-center justify-center gap-1 p-6 text-center transition-colors hover:bg-secondary"
        >
          <div className="flex items-center gap-1.5 font-display text-3xl text-claude-orange">
            <Github className="h-6 w-6" />
            {STARS !== null ? (
              <span>
                <CountUp to={STARS} run={inView} />
              </span>
            ) : (
              <span className="text-xl">GitHub</span>
            )}
          </div>
          <div className="mt-1 font-mono text-xs uppercase tracking-wider text-claude-muted">
            {STARS !== null ? "Stars on GitHub" : "Open source · star us"}
          </div>
        </a>
      </div>
    </section>
  );
}
