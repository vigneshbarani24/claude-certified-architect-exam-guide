import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Flashcards",
  description:
    "A spaced-repetition flashcard deck for the Claude Certified Architect – Foundations exam with domain and difficulty filters.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
