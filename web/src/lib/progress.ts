/**
 * Progress engine — typed, SSR-safe localStorage module.
 *
 * Everything here is client-only. All `window`/`localStorage` access is
 * guarded behind `isBrowser()` so this module can be imported from server
 * components without crashing during SSR/prerender. When localStorage is
 * unavailable (private mode, quota, etc.) we degrade to an in-memory store
 * so the app keeps working for the session.
 */

const STORAGE_KEY = "ccaf-progress";
const SCHEMA_VERSION = 1;

/** Legacy guide read-tracking key (set by DomainNav / GuideLayout). */
const GUIDE_READ_KEY = "ccaf-guide-read";

/** Pass proxy: CCAF has no public scaled score, so we use 80%. */
export const PASS_THRESHOLD_PCT = 80;

/** Total flashcards per domain (5 domains × 50 = 250 deck). */
const CARDS_PER_DOMAIN = 50;
/** Cards reviewed in a domain needed to "clear" it. */
const DOMAIN_CLEAR_THRESHOLD = 40;

const DOMAIN_NAMES: Record<number, string> = {
  1: "Agentic Architecture & Orchestration",
  2: "Tool Design & MCP Integration",
  3: "Claude Code Configuration & Workflows",
  4: "Prompt Engineering & Structured Output",
  5: "Context Management & Reliability",
};

export interface MockAttempt {
  scoreCorrect: number;
  total: number;
  perDomain: Record<number, { correct: number; total: number }>;
  scenario: string;
  dateISO: string;
}

interface ProgressState {
  version: number;
  xp: number;
  /** Streak tracking. */
  streak: { count: number; lastActiveDateISO: string };
  /** Total flashcards reviewed (deduped by card id). */
  flashcardsReviewed: string[];
  /** Flashcards self-marked correct (deduped by card id). */
  flashcardsCorrect: string[];
  /** Guide section ids that have already awarded XP (dedupe). */
  guideSectionsAwarded: string[];
  /** Mock attempt history (most recent last). */
  attempts: MockAttempt[];
  /** Badges that have been earned, with timestamp. */
  badgesEarned: Record<string, string>;
  /** Opt-in leaderboard display name. */
  displayName: string;
}

function defaultState(): ProgressState {
  return {
    version: SCHEMA_VERSION,
    xp: 0,
    streak: { count: 0, lastActiveDateISO: "" },
    flashcardsReviewed: [],
    flashcardsCorrect: [],
    guideSectionsAwarded: [],
    attempts: [],
    badgesEarned: {},
    displayName: "",
  };
}

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

// In-memory fallback used when localStorage throws (private mode / quota).
let memoryState: ProgressState | null = null;
let usingMemory = false;

function readState(): ProgressState {
  if (!isBrowser()) return defaultState();
  if (usingMemory) return memoryState ?? defaultState();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw) as Partial<ProgressState>;
    // Forward-compatible merge: unknown/old schema falls back to defaults
    // for any missing field rather than crashing.
    if (parsed.version !== SCHEMA_VERSION) {
      return { ...defaultState(), ...parsed, version: SCHEMA_VERSION };
    }
    return { ...defaultState(), ...parsed };
  } catch {
    usingMemory = true;
    memoryState = memoryState ?? defaultState();
    return memoryState;
  }
}

function writeState(state: ProgressState): void {
  if (!isBrowser()) return;
  memoryState = state;
  if (usingMemory) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Switch to in-memory mode for the rest of the session.
    usingMemory = true;
  }
  notify();
}

// ---- Lightweight pub/sub so the React provider can re-read on change ----

type Listener = () => void;
const listeners = new Set<Listener>();

export function subscribe(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function notify(): void {
  listeners.forEach((l) => l());
}

// ---- Date helpers ----

function todayISO(): string {
  // Local calendar day (YYYY-MM-DD).
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function dayDiff(aISO: string, bISO: string): number {
  const a = new Date(`${aISO}T00:00:00`);
  const b = new Date(`${bISO}T00:00:00`);
  return Math.round((b.getTime() - a.getTime()) / 86_400_000);
}

// ---- Streak ----

/**
 * Mark today as active. Increments the streak on a new calendar day,
 * resets to 1 if more than one day was missed. Idempotent within a day.
 */
export function touchStreak(): void {
  const state = readState();
  const today = todayISO();
  const last = state.streak.lastActiveDateISO;
  if (last === today) return; // already counted today
  if (!last) {
    state.streak = { count: 1, lastActiveDateISO: today };
  } else {
    const gap = dayDiff(last, today);
    state.streak = {
      count: gap === 1 ? state.streak.count + 1 : 1,
      lastActiveDateISO: today,
    };
  }
  writeState(state);
}

// ---- XP ----

/** Award XP. `reason` is for clarity / future analytics, not persisted. */
export function awardXp(amount: number, _reason: string): void {
  if (amount <= 0) return;
  const state = readState();
  state.xp += amount;
  writeState(state);
  touchStreak();
  refreshBadges();
}

export const XP = {
  FLASHCARD_REVIEWED: 5,
  FLASHCARD_CORRECT: 10,
  MOCK_QUESTION_ANSWERED: 8,
  MOCK_QUESTION_CORRECT: 15,
  GUIDE_SECTION_READ: 20,
  MOCK_PASS_BONUS: 100,
} as const;

/** Record a flashcard as reviewed (deduped). Awards XP only the first time. */
export function recordFlashcardReviewed(cardId: string): number {
  const state = readState();
  if (state.flashcardsReviewed.includes(cardId)) return 0;
  state.flashcardsReviewed.push(cardId);
  state.xp += XP.FLASHCARD_REVIEWED;
  writeState(state);
  touchStreak();
  refreshBadges();
  return XP.FLASHCARD_REVIEWED;
}

/** Record a flashcard self-marked correct (deduped). */
export function recordFlashcardCorrect(cardId: string): number {
  const state = readState();
  if (state.flashcardsCorrect.includes(cardId)) return 0;
  state.flashcardsCorrect.push(cardId);
  state.xp += XP.FLASHCARD_CORRECT;
  writeState(state);
  touchStreak();
  refreshBadges();
  return XP.FLASHCARD_CORRECT;
}

/** Award guide-section XP exactly once per section id. */
export function recordGuideSectionRead(sectionId: string): number {
  const state = readState();
  if (state.guideSectionsAwarded.includes(sectionId)) return 0;
  state.guideSectionsAwarded.push(sectionId);
  state.xp += XP.GUIDE_SECTION_READ;
  writeState(state);
  touchStreak();
  refreshBadges();
  return XP.GUIDE_SECTION_READ;
}

// ---- Mock attempts ----

export function recordAttempt(attempt: MockAttempt): {
  xpEarned: number;
  passed: boolean;
} {
  const state = readState();
  state.attempts.push(attempt);

  const pct =
    attempt.total > 0
      ? Math.round((attempt.scoreCorrect / attempt.total) * 100)
      : 0;
  const passed = pct >= PASS_THRESHOLD_PCT;

  let xpEarned =
    attempt.total * XP.MOCK_QUESTION_ANSWERED +
    attempt.scoreCorrect * XP.MOCK_QUESTION_CORRECT;
  if (passed) xpEarned += XP.MOCK_PASS_BONUS;

  state.xp += xpEarned;
  writeState(state);
  touchStreak();
  refreshBadges();
  return { xpEarned, passed };
}

export function getAttempts(): MockAttempt[] {
  return readState().attempts;
}

export function getBest(): MockAttempt | null {
  const attempts = readState().attempts;
  if (attempts.length === 0) return null;
  return attempts.reduce((best, a) => {
    const ap = a.total > 0 ? a.scoreCorrect / a.total : 0;
    const bp = best.total > 0 ? best.scoreCorrect / best.total : 0;
    return ap > bp ? a : best;
  });
}

// ---- Ranks ----

export interface Rank {
  name: string;
  min: number;
  /** XP at which the next tier begins, or null if max tier. */
  next: number | null;
  /** Progress toward the next tier, 0-100. 100 at max tier. */
  progressPct: number;
}

const RANK_TIERS: { name: string; min: number }[] = [
  { name: "Apprentice", min: 0 },
  { name: "Practitioner", min: 300 },
  { name: "Architect", min: 1000 },
  { name: "Master Architect", min: 2500 },
];

/** Pure function: derive rank tier + progress from an XP value. */
export function rankForXp(xp: number): Rank {
  let tierIndex = 0;
  for (let i = 0; i < RANK_TIERS.length; i++) {
    if (xp >= RANK_TIERS[i].min) tierIndex = i;
  }
  const tier = RANK_TIERS[tierIndex];
  const nextTier = RANK_TIERS[tierIndex + 1];
  if (!nextTier) {
    return { name: tier.name, min: tier.min, next: null, progressPct: 100 };
  }
  const span = nextTier.min - tier.min;
  const into = xp - tier.min;
  const progressPct = Math.max(
    0,
    Math.min(100, Math.round((into / span) * 100))
  );
  return {
    name: tier.name,
    min: tier.min,
    next: nextTier.min,
    progressPct,
  };
}

export function getRankTiers(): { name: string; min: number }[] {
  return RANK_TIERS.map((t) => ({ ...t }));
}

// ---- Badges ----

export interface Badge {
  id: string;
  label: string;
  description: string;
  earnedAtISO: string;
}

interface BadgeDef {
  id: string;
  label: string;
  description: string;
  earned: (s: ProgressState) => boolean;
}

function flashcardsByDomain(s: ProgressState): Record<number, number> {
  // Card ids look like "d{domain}-..." but to be robust we derive the
  // domain from the leading "d<N>" segment when present, else 0.
  const counts: Record<number, number> = {};
  for (const id of s.flashcardsReviewed) {
    const m = /^d(\d)/i.exec(id);
    const dom = m ? Number(m[1]) : 0;
    counts[dom] = (counts[dom] ?? 0) + 1;
  }
  return counts;
}

function bestPct(s: ProgressState): number {
  let best = 0;
  for (const a of s.attempts) {
    const p = a.total > 0 ? (a.scoreCorrect / a.total) * 100 : 0;
    if (p > best) best = p;
  }
  return best;
}

const BADGE_DEFS: BadgeDef[] = [
  {
    id: "first-steps",
    label: "First Steps",
    description: "Earn your first XP on the study system.",
    earned: (s) => s.xp > 0,
  },
  ...[1, 2, 3, 4, 5].map((d) => ({
    id: `domain-cleared-${d}`,
    label: `Domain Cleared: D${d}`,
    description: `Review at least ${DOMAIN_CLEAR_THRESHOLD} of ${CARDS_PER_DOMAIN} D${d} flashcards (${DOMAIN_NAMES[d]}).`,
    earned: (s: ProgressState) =>
      (flashcardsByDomain(s)[d] ?? 0) >= DOMAIN_CLEAR_THRESHOLD,
  })),
  {
    id: "centurion",
    label: "Centurion",
    description: "Review 100 flashcards.",
    earned: (s) => s.flashcardsReviewed.length >= 100,
  },
  {
    id: "perfect-mock",
    label: "Perfect Mock",
    description: "Score 100% on a mock exam attempt.",
    earned: (s) => s.attempts.some((a) => a.total > 0 && a.scoreCorrect === a.total),
  },
  {
    id: "pass",
    label: "Pass",
    description: `Score ≥${PASS_THRESHOLD_PCT}% on a mock attempt (unofficial CCAF pass proxy).`,
    earned: (s) => bestPct(s) >= PASS_THRESHOLD_PCT,
  },
  {
    id: "streak-7",
    label: "Streak 7",
    description: "Maintain a 7-day study streak.",
    earned: (s) => s.streak.count >= 7,
  },
  {
    id: "streak-30",
    label: "Streak 30",
    description: "Maintain a 30-day study streak.",
    earned: (s) => s.streak.count >= 30,
  },
];

/** Re-evaluate badge definitions and persist newly earned ones. */
function refreshBadges(): void {
  const state = readState();
  let changed = false;
  const now = new Date().toISOString();
  for (const def of BADGE_DEFS) {
    if (!state.badgesEarned[def.id] && def.earned(state)) {
      state.badgesEarned[def.id] = now;
      changed = true;
    }
  }
  if (changed) {
    if (isBrowser() && !usingMemory) {
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      } catch {
        usingMemory = true;
      }
    }
    memoryState = state;
    notify();
  }
}

export function unlockedBadges(): Badge[] {
  const state = readState();
  return BADGE_DEFS.filter((d) => state.badgesEarned[d.id]).map((d) => ({
    id: d.id,
    label: d.label,
    description: d.description,
    earnedAtISO: state.badgesEarned[d.id],
  }));
}

export interface BadgeStatus extends Badge {
  earned: boolean;
}

/** All badges with earned/locked status (for the profile grid). */
export function allBadges(): BadgeStatus[] {
  const state = readState();
  return BADGE_DEFS.map((d) => ({
    id: d.id,
    label: d.label,
    description: d.description,
    earned: Boolean(state.badgesEarned[d.id]),
    earnedAtISO: state.badgesEarned[d.id] ?? "",
  }));
}

// ---- Display name (leaderboard opt-in) ----

export function getDisplayName(): string {
  return readState().displayName;
}

export function setDisplayName(name: string): void {
  const state = readState();
  state.displayName = name.slice(0, 40);
  writeState(state);
}

// ---- Aggregate snapshot for UI ----

export interface ProgressSnapshot {
  xp: number;
  rank: Rank;
  streak: number;
  flashcardsReviewed: number;
  flashcardsCorrect: number;
  attempts: MockAttempt[];
  best: MockAttempt | null;
  bestPct: number;
  badges: Badge[];
  allBadges: BadgeStatus[];
  guideSectionsRead: number;
  guideTotalSections: number;
  guidePct: number;
  displayName: string;
}

/**
 * Count guide sections from the legacy `ccaf-guide-read` key so the profile
 * can show guide % without re-reading the markdown.
 */
function guideReadCount(): number {
  if (!isBrowser()) return 0;
  try {
    const raw = window.localStorage.getItem(GUIDE_READ_KEY);
    if (!raw) return 0;
    const ids = JSON.parse(raw) as string[];
    return Array.isArray(ids) ? ids.length : 0;
  } catch {
    return 0;
  }
}

export function getSnapshot(guideTotalSections = 0): ProgressSnapshot {
  const state = readState();
  const readCount = guideReadCount();
  return {
    xp: state.xp,
    rank: rankForXp(state.xp),
    streak: state.streak.count,
    flashcardsReviewed: state.flashcardsReviewed.length,
    flashcardsCorrect: state.flashcardsCorrect.length,
    attempts: state.attempts,
    best: getBest(),
    bestPct: bestPct(state),
    badges: unlockedBadges(),
    allBadges: allBadges(),
    guideSectionsRead: readCount,
    guideTotalSections,
    guidePct:
      guideTotalSections > 0
        ? Math.round((readCount / guideTotalSections) * 100)
        : 0,
    displayName: state.displayName,
  };
}

export { DOMAIN_NAMES };
