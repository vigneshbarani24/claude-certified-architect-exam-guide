import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Curriculum",
  description:
    "A guided, domain-by-domain path through the Claude Certified Architect – Foundations exam with mapped guide chapters and targeted practice.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
