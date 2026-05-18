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
const SCHEMA_VERSION = 2;

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

/** Flashcard difficulty (re-declared locally to avoid a React/lib import). */
export type Difficulty = "easy" | "medium" | "hard";

/** Leitner-style spaced-repetition card schedule. */
export interface SrsCard {
  box: number;
  intervalDays: number;
  dueDateISO: string;
  lastRatedISO: string;
}

/** Per-day study activity counters (keyed by local YYYY-MM-DD). */
export interface DailyActivity {
  cardsReviewed: number;
  questionsAnswered: number;
  sectionsRead: number;
  xpEarned: number;
}

/** Resume / "continue where you left off" state. */
export interface ResumeState {
  drill:
    | {
        domain: number | "all";
        difficulty: Difficulty | "all";
        index: number;
        dueOnly: boolean;
      }
    | null;
  lastGuideSectionId: string | null;
  updatedISO: string;
}

/** Leitner box → review interval (days). Box 1..5 → index 0..4. */
const SRS_INTERVALS = [0, 1, 3, 7, 16] as const;

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
  /** Spaced-repetition schedule, keyed by flashcard id. */
  srs: Record<string, SrsCard>;
  /** Per-day study activity, keyed by local YYYY-MM-DD. */
  activityLog: Record<string, DailyActivity>;
  /** Resume state for drill / guide. */
  resume: ResumeState;
}

function defaultResume(): ResumeState {
  return { drill: null, lastGuideSectionId: null, updatedISO: "" };
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
    srs: {},
    activityLog: {},
    resume: defaultResume(),
  };
}

/**
 * Forward-compatible migration. Starts from a fresh default state, spreads the
 * parsed (possibly v1) blob over it, then explicitly coerces the three v2
 * fields if they are missing or the wrong type. v1 blobs (no srs/activityLog/
 * resume) load without crash and preserve xp, streak, attempts, flashcards,
 * badges, displayName and guideSectionsAwarded unchanged.
 */
function migrate(parsed: Partial<ProgressState>): ProgressState {
  const base = defaultState();
  const merged: ProgressState = { ...base, ...parsed };
  if (typeof merged.srs !== "object" || merged.srs === null) {
    merged.srs = {};
  }
  if (typeof merged.activityLog !== "object" || merged.activityLog === null) {
    merged.activityLog = {};
  }
  if (
    typeof merged.resume !== "object" ||
    merged.resume === null ||
    !("drill" in merged.resume) ||
    !("lastGuideSectionId" in merged.resume)
  ) {
    merged.resume = defaultResume();
  }
  merged.version = SCHEMA_VERSION;
  return merged;
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
    // Forward-compatible migration: unknown/old schema is upgraded in place
    // rather than crashing. Behaviorally identical to the old merge for v1.
    return migrate(parsed);
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

/** Add N local-calendar days to today, returning YYYY-MM-DD. */
function addDaysISO(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// ---- Activity log ----

function emptyActivity(): DailyActivity {
  return {
    cardsReviewed: 0,
    questionsAnswered: 0,
    sectionsRead: 0,
    xpEarned: 0,
  };
}

export function getActivityLog(): Record<string, DailyActivity> {
  return readState().activityLog;
}

/**
 * Accumulate a partial activity delta into today's bucket. Used internally by
 * the record* / awardXp engine fns; safe to call standalone (no-op on server).
 */
export function appendActivity(delta: Partial<DailyActivity>): void {
  const state = readState();
  const key = todayISO();
  const cur = state.activityLog[key] ?? emptyActivity();
  state.activityLog[key] = {
    cardsReviewed: cur.cardsReviewed + (delta.cardsReviewed ?? 0),
    questionsAnswered: cur.questionsAnswered + (delta.questionsAnswered ?? 0),
    sectionsRead: cur.sectionsRead + (delta.sectionsRead ?? 0),
    xpEarned: cur.xpEarned + (delta.xpEarned ?? 0),
  };
  writeState(state);
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
  appendActivity({ xpEarned: amount });
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
  appendActivity({ cardsReviewed: 1 });
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
  appendActivity({ sectionsRead: 1 });
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
  appendActivity({ questionsAnswered: attempt.total, xpEarned });
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

// ---- Spaced repetition (Leitner) ----

export type SrsRating = "again" | "hard" | "good";

/**
 * Record a spaced-repetition rating for a card. Does NOT touch XP (the XP
 * dedupe lives in recordFlashcardReviewed/Correct). Returns the new card.
 *
 *  - again → box 1, interval 0, due today
 *  - hard  → box = max(1, box-1), interval = table[newBox], due today+interval
 *  - good  → box = min(5, box+1), interval = table[newBox], due today+interval
 */
export function recordSrsRating(
  cardId: string,
  rating: SrsRating
): SrsCard {
  const state = readState();
  const prev = state.srs[cardId];
  const prevBox = prev ? prev.box : 0;
  let box: number;
  if (rating === "again") {
    box = 1;
  } else if (rating === "hard") {
    box = Math.max(1, prevBox - 1);
  } else {
    box = Math.min(5, (prevBox || 0) + 1);
  }
  const intervalDays = SRS_INTERVALS[box - 1] ?? 0;
  const card: SrsCard = {
    box,
    intervalDays,
    dueDateISO: addDaysISO(intervalDays),
    lastRatedISO: new Date().toISOString(),
  };
  state.srs[cardId] = card;
  writeState(state);
  return card;
}

export function getSrsCard(cardId: string): SrsCard | null {
  return readState().srs[cardId] ?? null;
}

/** Count of scheduled cards per Leitner box (1..5). */
export function getSrsBoxDistribution(): Record<number, number> {
  const state = readState();
  const dist: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const id of Object.keys(state.srs)) {
    const b = state.srs[id].box;
    if (b >= 1 && b <= 5) dist[b] += 1;
  }
  return dist;
}

/**
 * Ids that are scheduled (rated at least once) AND due as of `nowISO`
 * (defaults to today). New / un-rated cards are NOT due.
 */
export function getDueCardIds(
  allCardIds: string[],
  nowISO?: string
): string[] {
  const state = readState();
  const today = nowISO ?? todayISO();
  return allCardIds.filter((id) => {
    const c = state.srs[id];
    if (!c) return false;
    return c.dueDateISO <= today;
  });
}

export function getDueCount(allCardIds: string[]): number {
  return getDueCardIds(allCardIds).length;
}

// ---- Guide read ids ----

/**
 * The set of guide section ids the user has marked read. Mirrors the
 * guideReadCount() SSR / try-catch pattern; returns [] on server/throw.
 */
export function getGuideReadIds(): string[] {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(GUIDE_READ_KEY);
    if (!raw) return [];
    const ids = JSON.parse(raw) as string[];
    return Array.isArray(ids) ? ids : [];
  } catch {
    return [];
  }
}

// ---- Domain mastery & weak areas ----

export interface DomainMastery {
  domain: number;
  /** 0-100 composite mastery. */
  mastery: number;
  reviewedPct: number;
  correctPct: number;
  mockPct: number;
  guidePct: number;
}

export interface WeakArea {
  domain: number;
  mastery: number;
  /** Priority = (1 - mastery/100) * exam weight %. */
  priority: number;
  /** The weakest sub-score driving the recommendation. */
  reason: "guide" | "mock" | "reviewed" | "correct";
}

interface MasteryInput {
  reviewedIds: string[];
  correctIds: string[];
  attempts: MockAttempt[];
  guideReadIds: string[];
  /** Total guide slugs per domain, supplied by the caller (learn.ts). */
  guideSlugCounts?: Record<number, number>;
  /** Read guide slug ids that belong to each domain. */
  guideReadByDomain?: Record<number, number>;
}

function domainOf(id: string): number {
  const m = /^d(\d)/i.exec(id);
  return m ? Number(m[1]) : 0;
}

export function getDomainMastery(input: MasteryInput): DomainMastery[] {
  const reviewedByDomain: Record<number, number> = {};
  for (const id of input.reviewedIds) {
    const d = domainOf(id);
    reviewedByDomain[d] = (reviewedByDomain[d] ?? 0) + 1;
  }
  const correctByDomain: Record<number, number> = {};
  for (const id of input.correctIds) {
    const d = domainOf(id);
    correctByDomain[d] = (correctByDomain[d] ?? 0) + 1;
  }
  const mockByDomain: Record<number, { correct: number; total: number }> = {};
  for (const a of input.attempts) {
    for (const [k, v] of Object.entries(a.perDomain)) {
      const d = Number(k);
      const rec = mockByDomain[d] ?? { correct: 0, total: 0 };
      rec.correct += v.correct;
      rec.total += v.total;
      mockByDomain[d] = rec;
    }
  }

  const out: DomainMastery[] = [];
  for (const d of [1, 2, 3, 4, 5]) {
    const reviewedPct = Math.min(1, (reviewedByDomain[d] ?? 0) / CARDS_PER_DOMAIN);
    const correctPct = Math.min(1, (correctByDomain[d] ?? 0) / CARDS_PER_DOMAIN);
    const mock = mockByDomain[d];
    const mockPct = mock ? mock.correct / Math.max(1, mock.total) : 0;
    const total = input.guideSlugCounts?.[d] ?? 0;
    const read = input.guideReadByDomain?.[d] ?? 0;
    const guidePct = total > 0 ? Math.min(1, read / total) : 0;
    const mastery = Math.max(
      0,
      Math.min(
        100,
        Math.round(
          100 *
            (0.3 * reviewedPct +
              0.3 * correctPct +
              0.25 * mockPct +
              0.15 * guidePct)
        )
      )
    );
    out.push({
      domain: d,
      mastery,
      reviewedPct,
      correctPct,
      mockPct,
      guidePct,
    });
  }
  return out;
}

export function getWeakAreas(mastery: DomainMastery[]): WeakArea[] {
  const ranked = mastery
    .map((m) => {
      const weight = DOMAIN_NAMES[m.domain]
        ? DOMAIN_WEIGHTS[m.domain] ?? 0
        : 0;
      const priority = (1 - m.mastery / 100) * weight;
      const subs: { key: WeakArea["reason"]; v: number }[] = [
        { key: "reviewed", v: m.reviewedPct },
        { key: "correct", v: m.correctPct },
        { key: "mock", v: m.mockPct },
        { key: "guide", v: m.guidePct },
      ];
      subs.sort((a, b) => a.v - b.v);
      return {
        domain: m.domain,
        mastery: m.mastery,
        priority,
        reason: subs[0].key,
      };
    })
    .sort((a, b) => b.priority - a.priority);

  const withDeficit = ranked.filter((r) => r.priority > 0);
  if (withDeficit.length === 0) return [];
  // Cap at 4, but show at least 2 when any deficit exists.
  const count = Math.min(4, Math.max(2, withDeficit.length));
  return withDeficit.slice(0, count);
}

const DOMAIN_WEIGHTS: Record<number, number> = {
  1: 27,
  2: 18,
  3: 20,
  4: 20,
  5: 15,
};

/**
 * Optional registered guide slug→domain map so getSnapshot() can include
 * guidePct in mastery without a circular import on learn.ts. learn.ts calls
 * registerGuideDomainMap() at module load (it is imported by /learn UI).
 */
let guideDomainMap: Record<string, number> | null = null;

export function registerGuideDomainMap(map: Record<string, number>): void {
  guideDomainMap = map;
}

function guideCountsFromMap(readIds: string[]): {
  slugCounts: Record<number, number>;
  readByDomain: Record<number, number>;
} {
  const slugCounts: Record<number, number> = {};
  const readByDomain: Record<number, number> = {};
  if (!guideDomainMap) return { slugCounts, readByDomain };
  const readSet = new Set(readIds);
  for (const [slug, dom] of Object.entries(guideDomainMap)) {
    slugCounts[dom] = (slugCounts[dom] ?? 0) + 1;
    if (readSet.has(slug)) {
      readByDomain[dom] = (readByDomain[dom] ?? 0) + 1;
    }
  }
  return { slugCounts, readByDomain };
}

function computeMastery(state: ProgressState): DomainMastery[] {
  const guideReadIds = getGuideReadIds();
  const { slugCounts, readByDomain } = guideCountsFromMap(guideReadIds);
  return getDomainMastery({
    reviewedIds: state.flashcardsReviewed,
    correctIds: state.flashcardsCorrect,
    attempts: state.attempts,
    guideReadIds,
    guideSlugCounts: slugCounts,
    guideReadByDomain: readByDomain,
  });
}

// ---- Resume state ----

export function getResume(): ResumeState {
  return readState().resume;
}

export function setResumeDrill(drill: ResumeState["drill"]): void {
  const state = readState();
  state.resume = {
    ...state.resume,
    drill,
    updatedISO: new Date().toISOString(),
  };
  writeState(state);
}

export function setResumeGuideSection(id: string): void {
  const state = readState();
  if (state.resume.lastGuideSectionId === id) return;
  state.resume = {
    ...state.resume,
    lastGuideSectionId: id,
    updatedISO: new Date().toISOString(),
  };
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
  /** Count of scheduled SRS cards due today. */
  srsDue: number;
  /** Composite per-domain mastery (guidePct populated if map registered). */
  mastery: DomainMastery[];
  activityLog: Record<string, DailyActivity>;
  resume: ResumeState;
}

/** Due count derived purely from the scheduled srs map (no deck needed). */
function srsDueFromState(state: ProgressState): number {
  const today = todayISO();
  let n = 0;
  for (const id of Object.keys(state.srs)) {
    if (state.srs[id].dueDateISO <= today) n += 1;
  }
  return n;
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
    srsDue: srsDueFromState(state),
    mastery: computeMastery(state),
    activityLog: state.activityLog,
    resume: state.resume,
  };
}

export { DOMAIN_NAMES };
