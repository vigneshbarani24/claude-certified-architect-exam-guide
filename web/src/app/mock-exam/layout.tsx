import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Mock Exam",
  description:
    "Scenario-based mock exam with flag-for-review, a pre-submit review screen, an optional timer, and a per-domain score breakdown.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
