import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Diagnostic",
  description:
    "A short 12-question diagnostic spanning all five exam domains that feeds your on-device mastery profile.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
