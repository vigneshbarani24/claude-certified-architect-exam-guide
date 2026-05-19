import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";

import {
  DOMAIN_INFO,
  DOMAIN_SLUGS,
  domainInfoBySlug,
  guideSlugsForDomain,
} from "@/lib/learn";
import {
  getGuideChapters,
  renderChaptersHtml,
} from "@/lib/guide-chapters";
import { Badge } from "@/components/ui/badge";
import { DomainPractice } from "@/components/learn/DomainPractice";
import { DISCLAIMER } from "@/components/layout/Footer";

// Prerender exactly the 5 known domain slugs; 404 anything else.
export const dynamic = "force-static";
export const dynamicParams = false;

export function generateStaticParams(): { domain: string }[] {
  return DOMAIN_SLUGS.map((domain) => ({ domain }));
}

export function generateMetadata({
  params,
}: {
  params: { domain: string };
}): Metadata {
  const info = domainInfoBySlug(params.domain);
  if (!info) return { title: "Domain — CCAF Guide" };
  return {
    title: `D${info.domain}: ${info.name} — CCAF Guide`,
    description: `${info.tagline} Domain ${info.domain} is ${info.weight}% of the Claude Certified Architect – Foundations exam.`,
  };
}

export default async function DomainPage({
  params,
}: {
  params: { domain: string };
}) {
  const info = domainInfoBySlug(params.domain);
  if (!info) notFound();

  const domainChapterSlugs = new Set(guideSlugsForDomain(info.domain));
  const chapters = getGuideChapters().filter((c) =>
    domainChapterSlugs.has(c.slug)
  );
  const html = await renderChaptersHtml(chapters);

  const idx = DOMAIN_INFO.findIndex((d) => d.domain === info.domain);
  const prevInfo = idx > 0 ? DOMAIN_INFO[idx - 1] : null;
  const nextInfo =
    idx < DOMAIN_INFO.length - 1 ? DOMAIN_INFO[idx + 1] : null;

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <nav className="mb-6 font-mono text-xs text-claude-muted">
        <Link href="/learn" className="hover:text-foreground">
          Curriculum
        </Link>
        <span className="px-2">/</span>
        <span className="text-foreground">D{info.domain}</span>
      </nav>

      <header className="mb-8 border-b border-border pb-8">
        <div className="flex flex-wrap items-center gap-3">
          <span className="font-mono text-claude-orange">
            Domain {info.domain}
          </span>
          <Badge variant="outline">{info.weight}% of the exam</Badge>
          <Badge variant="outline">
            {chapters.length} guide chapter
            {chapters.length === 1 ? "" : "s"}
          </Badge>
        </div>
        <h1 className="mt-3 font-display text-4xl">{info.name}</h1>
        <p className="mt-4 max-w-3xl leading-relaxed text-muted-foreground">
          {info.overview}
        </p>
      </header>

      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_300px]">
        <article
          className="guide-prose min-w-0"
          dangerouslySetInnerHTML={{ __html: html }}
        />
        <aside>
          <DomainPractice
            domain={info.domain}
            prev={
              prevInfo
                ? { slug: prevInfo.slug, name: prevInfo.name }
                : null
            }
            next={
              nextInfo
                ? { slug: nextInfo.slug, name: nextInfo.name }
                : null
            }
          />
        </aside>
      </div>

      <p className="mt-12 border-t border-border pt-6 text-xs leading-relaxed text-claude-muted">
        {DISCLAIMER}
      </p>
    </div>
  );
}
