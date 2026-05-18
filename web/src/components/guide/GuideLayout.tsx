"use client";

import { useEffect, useMemo, useState } from "react";

import type { TocItem } from "@/components/guide/DomainNav";
import { DomainNav } from "@/components/guide/DomainNav";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "ccaf-guide-read";

interface GuideLayoutProps {
  html: string;
  toc: TocItem[];
}

export function GuideLayout({ html, toc }: GuideLayoutProps) {
  const [activeId, setActiveId] = useState<string>("");
  const [readCount, setReadCount] = useState(0);

  const sectionIds = useMemo(
    () => toc.filter((t) => t.level <= 2).map((t) => t.id),
    [toc]
  );

  // Scroll-spy.
  useEffect(() => {
    const headings = toc
      .map((t) => document.getElementById(t.id))
      .filter((el): el is HTMLElement => el !== null);
    if (headings.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActiveId(visible[0].target.id);
      },
      { rootMargin: "-80px 0px -70% 0px", threshold: 0 }
    );
    headings.forEach((h) => observer.observe(h));
    return () => observer.disconnect();
  }, [toc]);

  // Read progress derived from localStorage; refresh on storage/focus.
  useEffect(() => {
    const recompute = () => {
      try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        const ids = raw ? (JSON.parse(raw) as string[]) : [];
        const set = new Set(ids);
        setReadCount(sectionIds.filter((id) => set.has(id)).length);
      } catch {
        setReadCount(0);
      }
    };
    recompute();
    const id = window.setInterval(recompute, 800);
    window.addEventListener("focus", recompute);
    return () => {
      window.clearInterval(id);
      window.removeEventListener("focus", recompute);
    };
  }, [sectionIds]);

  const pct =
    sectionIds.length > 0
      ? Math.round((readCount / sectionIds.length) * 100)
      : 0;

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <div className="mb-6">
        <div className="mb-2 flex items-center justify-between text-sm">
          <h1 className="font-display text-3xl">Study Guide</h1>
          <span className="font-mono text-xs text-muted-foreground">
            {readCount}/{sectionIds.length} sections read · {pct}%
          </span>
        </div>
        <Progress value={pct} />
      </div>

      <div className="grid gap-8 lg:grid-cols-[220px_minmax(0,1fr)_220px]">
        {/* Left: domain/section nav */}
        <aside className="hidden lg:block">
          <div className="sticky top-24 max-h-[calc(100vh-7rem)] overflow-y-auto pr-2">
            <DomainNav items={toc} activeId={activeId} />
          </div>
        </aside>

        {/* Center: rendered guide */}
        <article
          className="guide-prose min-w-0"
          dangerouslySetInnerHTML={{ __html: html }}
        />

        {/* Right: on-page TOC with scroll-spy */}
        <aside className="hidden lg:block">
          <div className="sticky top-24 max-h-[calc(100vh-7rem)] overflow-y-auto pl-2 text-sm">
            <p className="mb-3 font-mono text-xs uppercase tracking-wider text-claude-muted">
              On this page
            </p>
            <ul className="space-y-1">
              {toc
                .filter((t) => t.level >= 2)
                .map((t) => (
                  <li
                    key={t.id}
                    className={cn(t.level === 3 && "pl-3")}
                  >
                    <a
                      href={`#${t.id}`}
                      className={cn(
                        "block truncate py-0.5 transition-colors",
                        activeId === t.id
                          ? "text-claude-orange"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {t.text}
                    </a>
                  </li>
                ))}
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}
