import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Drill",
  description:
    "Spaced-repetition flashcard drilling that resurfaces cards right before you would forget them.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
