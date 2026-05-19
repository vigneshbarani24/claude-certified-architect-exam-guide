import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Personal Leaderboard",
  description:
    "Your personal mock-exam score board, kept entirely on-device. Share a card to challenge friends — there is no central server.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
