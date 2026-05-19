"use client";

import { useEffect, useRef, useState } from "react";

interface UseInViewOptions {
  /** Fire only the first time the element enters the viewport. */
  once?: boolean;
  rootMargin?: string;
  threshold?: number;
}

/**
 * Minimal IntersectionObserver hook for reveal / count-up animations.
 * SSR-safe (no observer until mounted) and reduced-motion aware: when the
 * user prefers reduced motion we report "in view" immediately so content is
 * shown at its final state with no animation.
 */
export function useInView<T extends HTMLElement = HTMLDivElement>({
  once = true,
  rootMargin = "0px 0px -10% 0px",
  threshold = 0.15,
}: UseInViewOptions = {}) {
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const reduced =
      typeof window !== "undefined" &&
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reduced || typeof IntersectionObserver === "undefined") {
      setInView(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setInView(true);
            if (once) observer.disconnect();
          } else if (!once) {
            setInView(false);
          }
        }
      },
      { rootMargin, threshold }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [once, rootMargin, threshold]);

  return { ref, inView };
}

/**
 * Whether the user prefers reduced motion. Returns false during SSR and the
 * first client render so output is deterministic, then updates after mount.
 */
export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return reduced;
}
