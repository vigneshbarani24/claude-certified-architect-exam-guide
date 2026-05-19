import type { Metadata } from "next";
import { ShieldCheck } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { DISCLAIMER } from "@/components/layout/Footer";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "Privacy — CCAF Guide",
  description:
    "No server, no account, no analytics, no cookies, no tracking. All study progress stays in your browser's localStorage and is never transmitted.",
};

const POINTS: { title: string; body: string }[] = [
  {
    title: "No server, no account",
    body: "The site is fully static. There is no backend to sign in to and nothing to register. You never create an account or give us an email address.",
  },
  {
    title: "No analytics, no cookies, no tracking",
    body: "There are no analytics scripts, no advertising, no third-party trackers, and no cookies. We do not profile you and there is nothing for us to sell.",
  },
  {
    title: "Your progress stays on your device",
    body: "XP, rank, streak, badges, spaced-repetition schedule, mock and diagnostic attempts, and guide read-state are all stored in your browser's localStorage. They are computed locally and never transmitted anywhere.",
  },
  {
    title: "Share cards are generated locally",
    body: "When you export a share card it is rendered in your browser with Canvas. The image is created on your device; nothing is uploaded to produce it.",
  },
  {
    title: "You are in control",
    body: "Clearing this site's data in your browser (or using private browsing) erases all stored progress permanently. There is no copy anywhere else, because nothing ever leaves your device.",
  },
  {
    title: "External links",
    body: "Some pages link out to official documentation and the project repository. Once you follow an external link, that destination's own privacy practices apply.",
  },
];

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-12 sm:px-6">
      <div>
        <h1 className="flex items-center gap-3 font-display text-4xl">
          <ShieldCheck className="h-8 w-8 text-claude-orange" />
          Privacy
        </h1>
        <p className="mt-3 text-muted-foreground">
          Privacy here is not a policy you have to trust — it is a consequence
          of how the site is built. Nothing about your study leaves your
          device, because there is no server to send it to.
        </p>
      </div>

      <div className="space-y-4">
        {POINTS.map((p) => (
          <Card key={p.title}>
            <CardContent className="space-y-1.5 p-6">
              <h2 className="font-display text-xl text-foreground">
                {p.title}
              </h2>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {p.body}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <p className="border-t border-border pt-6 text-xs leading-relaxed text-claude-muted">
        {DISCLAIMER}
      </p>
    </div>
  );
}
