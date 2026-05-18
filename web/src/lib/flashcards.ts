import rawFlashcards from "@/data/flashcards.json";

export type Difficulty = "easy" | "medium" | "hard";

export interface Flashcard {
  id: string;
  domain: number;
  domain_name: string;
  front: string;
  back: string;
  difficulty: Difficulty;
  tags: string[];
}

const flashcards: Flashcard[] = (rawFlashcards as Flashcard[]).filter(
  (c) => typeof c.id === "string" && typeof c.front === "string"
);

export function getAllFlashcards(): Flashcard[] {
  return flashcards;
}

export function getDomains(): number[] {
  return Array.from(new Set(flashcards.map((c) => c.domain))).sort(
    (a, b) => a - b
  );
}

export interface FlashcardFilter {
  domain?: number | "all";
  difficulty?: Difficulty | "all";
}

export function filterFlashcards({
  domain = "all",
  difficulty = "all",
}: FlashcardFilter): Flashcard[] {
  return flashcards.filter((c) => {
    if (domain !== "all" && c.domain !== domain) return false;
    if (difficulty !== "all" && c.difficulty !== difficulty) return false;
    return true;
  });
}
