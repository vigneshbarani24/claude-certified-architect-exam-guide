"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

import {
  getSnapshot,
  subscribe,
  awardXp as awardXpLib,
  recordFlashcardReviewed,
  recordFlashcardCorrect,
  recordGuideSectionRead,
  recordAttempt as recordAttemptLib,
  setDisplayName as setDisplayNameLib,
  recordSrsRating as recordSrsRatingLib,
  setResumeDrill as setResumeDrillLib,
  setResumeGuideSection as setResumeGuideSectionLib,
  type ProgressSnapshot,
  type MockAttempt,
  type SrsRating,
  type SrsCard,
  type ResumeState,
} from "@/lib/progress";

interface ProgressContextValue {
  /** True once mounted on the client; render neutral until then. */
  mounted: boolean;
  snapshot: ProgressSnapshot;
  awardXp: (amount: number, reason: string) => void;
  flashcardReviewed: (cardId: string) => number;
  flashcardCorrect: (cardId: string) => number;
  guideSectionRead: (sectionId: string) => number;
  recordAttempt: (attempt: MockAttempt) => {
    xpEarned: number;
    passed: boolean;
  };
  setDisplayName: (name: string) => void;
  srsRate: (cardId: string, rating: SrsRating) => SrsCard;
  recordResumeDrill: (drill: ResumeState["drill"]) => void;
  setResumeGuideSection: (id: string) => void;
  refresh: () => void;
}

const NEUTRAL = getSnapshot(0);

const ProgressContext = createContext<ProgressContextValue | null>(null);

export function XpProvider({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  const [snapshot, setSnapshot] = useState<ProgressSnapshot>(NEUTRAL);

  const refresh = useCallback(() => {
    setSnapshot(getSnapshot(0));
  }, []);

  useEffect(() => {
    setMounted(true);
    refresh();
    const unsub = subscribe(refresh);
    // Cross-tab sync.
    const onStorage = () => refresh();
    window.addEventListener("storage", onStorage);
    return () => {
      unsub();
      window.removeEventListener("storage", onStorage);
    };
  }, [refresh]);

  const awardXp = useCallback(
    (amount: number, reason: string) => {
      awardXpLib(amount, reason);
      refresh();
    },
    [refresh]
  );

  const flashcardReviewed = useCallback(
    (cardId: string) => {
      const earned = recordFlashcardReviewed(cardId);
      refresh();
      return earned;
    },
    [refresh]
  );

  const flashcardCorrect = useCallback(
    (cardId: string) => {
      const earned = recordFlashcardCorrect(cardId);
      refresh();
      return earned;
    },
    [refresh]
  );

  const guideSectionRead = useCallback(
    (sectionId: string) => {
      const earned = recordGuideSectionRead(sectionId);
      refresh();
      return earned;
    },
    [refresh]
  );

  const recordAttempt = useCallback(
    (attempt: MockAttempt) => {
      const res = recordAttemptLib(attempt);
      refresh();
      return res;
    },
    [refresh]
  );

  const setDisplayName = useCallback(
    (name: string) => {
      setDisplayNameLib(name);
      refresh();
    },
    [refresh]
  );

  const srsRate = useCallback(
    (cardId: string, rating: SrsRating) => {
      const card = recordSrsRatingLib(cardId, rating);
      refresh();
      return card;
    },
    [refresh]
  );

  const recordResumeDrill = useCallback(
    (drill: ResumeState["drill"]) => {
      setResumeDrillLib(drill);
      refresh();
    },
    [refresh]
  );

  const setResumeGuideSection = useCallback(
    (id: string) => {
      setResumeGuideSectionLib(id);
      refresh();
    },
    [refresh]
  );

  return (
    <ProgressContext.Provider
      value={{
        mounted,
        snapshot,
        awardXp,
        flashcardReviewed,
        flashcardCorrect,
        guideSectionRead,
        recordAttempt,
        setDisplayName,
        srsRate,
        recordResumeDrill,
        setResumeGuideSection,
        refresh,
      }}
    >
      {children}
    </ProgressContext.Provider>
  );
}

export function useProgress(): ProgressContextValue {
  const ctx = useContext(ProgressContext);
  if (!ctx) {
    throw new Error("useProgress must be used within <XpProvider>");
  }
  return ctx;
}
