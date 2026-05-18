"use client";

import { useEffect, useState } from "react";
import { Check } from "lucide-react";

import { cn } from "@/lib/utils";
import { useProgress } from "@/components/progress/XpProvider";

export interface TocItem {
  id: string;
  text: string;
  level: number;
}

interface DomainNavProps {
  items: TocItem[];
  activeId?: string;
}

const STORAGE_KEY = "ccaf-guide-read";

export function DomainNav({ items, activeId }: DomainNavProps) {
  const [read, setRead] = useState<Set<string>>(new Set());
  const { guideSectionRead, setResumeGuideSection } = useProgress();

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) setRead(new Set(JSON.parse(raw) as string[]));
    } catch {
      /* ignore corrupt storage */
    }
  }, []);

  const persist = (next: Set<string>) => {
    setRead(next);
    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(Array.from(next))
      );
    } catch {
      /* storage unavailable */
    }
  };

  const toggle = (id: string) => {
    const next = new Set(read);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
      // Award guide XP (deduped by section id inside the progress engine,
      // so toggling read/unread repeatedly does not farm XP).
      guideSectionRead(id);
      setResumeGuideSection(id);
    }
    persist(next);
  };

  const sections = items.filter((i) => i.level <= 2);

  return (
    <nav className="space-y-1 text-sm">
      <p className="mb-3 font-mono text-xs uppercase tracking-wider text-claude-muted">
        Contents
      </p>
      {sections.length === 0 && (
        <p className="text-muted-foreground">No sections yet.</p>
      )}
      {sections.map((item) => {
        const isRead = read.has(item.id);
        const active = activeId === item.id;
        return (
          <div
            key={item.id}
            className={cn(
              "flex items-center gap-2",
              item.level === 2 && "pl-3"
            )}
          >
            <button
              type="button"
              onClick={() => toggle(item.id)}
              aria-label={isRead ? "Mark unread" : "Mark read"}
              className={cn(
                "flex h-4 w-4 shrink-0 items-center justify-center rounded-full border",
                isRead
                  ? "border-claude-orange bg-claude-orange text-[#0a0a0a]"
                  : "border-border"
              )}
            >
              {isRead && <Check className="h-2.5 w-2.5" />}
            </button>
            <a
              href={`#${item.id}`}
              className={cn(
                "truncate py-1 transition-colors",
                active
                  ? "text-claude-orange"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {item.text}
            </a>
          </div>
        );
      })}
    </nav>
  );
}
