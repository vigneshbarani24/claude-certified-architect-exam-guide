import type { Metadata } from "next";
import { Instrument_Serif, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { XpProvider } from "@/components/progress/XpProvider";

const display = Instrument_Serif({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

// Geist is not bundled in Next 14's next/font/google; Inter is the
// closest geometric UI sans available there.
const sans = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "CCAF Guide — Claude Certified Architect Foundations",
  description:
    "Free, open-source study system for the Claude Certified Architect – Foundations (CCAF) exam: study guide, mock exam, flashcards, and NotebookLM bundles.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${display.variable} ${sans.variable} ${mono.variable} h-full`}
    >
      <body className="flex min-h-full flex-col bg-background text-foreground">
        <XpProvider>
          <Navbar />
          <main className="flex-1">{children}</main>
          <Footer />
        </XpProvider>
      </body>
    </html>
  );
}
