import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Study Progress",
  description:
    "Your personalized study plan: per-domain mastery, what to study next, spaced review, and attempt history — computed on your device.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
