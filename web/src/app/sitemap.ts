import type { MetadataRoute } from "next";

import { SITE_URL } from "@/lib/site";
import { DOMAIN_SLUGS } from "@/lib/learn";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const routes = [
    "",
    "/guide",
    "/learn",
    "/learn/progress",
    "/learn/drill",
    "/learn/diagnostic",
    "/learn/quick-reference",
    "/learn/glossary",
    "/learn/exercises",
    ...DOMAIN_SLUGS.map((s) => `/learn/${s}`),
    "/mock-exam",
    "/flashcards",
    "/notebooklm",
    "/profile",
    "/leaderboard",
    "/resources",
    "/about",
    "/changelog",
    "/privacy",
  ];

  const now = new Date();
  return routes.map((path) => ({
    url: `${SITE_URL}${path}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: path === "" ? 1 : 0.7,
  }));
}
