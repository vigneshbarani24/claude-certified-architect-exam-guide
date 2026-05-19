import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Profile & XP",
  description:
    "Your on-device study profile: XP, rank tiers, daily streak, badges, and a shareable progress card. Stored only in your browser.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
