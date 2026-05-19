import type { Metadata } from "next";
import { Instrument_Serif, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { XpProvider } from "@/components/progress/XpProvider";
import { SITE_NAME, SITE_URL, SITE_LEGAL } from "@/lib/site";

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

const SITE_DESCRIPTION =
  "An independent, free, open-source study system for the Claude Certified Architect – Foundations exam: study guide, diagnostic, mock exam, flashcards, and NotebookLM bundles. Not affiliated with Anthropic; this site does not issue certifications.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} — Claude Certified Architect Foundations study system`,
    template: `%s — ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    url: SITE_URL,
    title: `${SITE_NAME} — independent CCAF study system`,
    description: SITE_DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} — independent CCAF study system`,
    description: SITE_DESCRIPTION,
  },
  other: {
    "site-legal": SITE_LEGAL,
  },
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
