import { readGuideMarkdown, renderGuideHtml, buildToc } from "@/lib/guide";
import { GuideLayout } from "@/components/guide/GuideLayout";
import { DISCLAIMER } from "@/components/layout/Footer";

export const dynamic = "force-static";

export const metadata = {
  title: "Study Guide — CCAF Guide",
  description:
    "The full Claude Certified Architect – Foundations study guide, organized by domain.",
};

export default async function GuidePage() {
  const markdown = readGuideMarkdown();
  const [html, toc] = await Promise.all([
    renderGuideHtml(markdown),
    Promise.resolve(buildToc(markdown)),
  ]);

  return (
    <>
      <GuideLayout html={html} toc={toc} />
      <div className="mx-auto max-w-7xl px-4 pb-12 sm:px-6">
        <p className="border-t border-border pt-6 text-xs leading-relaxed text-claude-muted">
          {DISCLAIMER}
        </p>
      </div>
    </>
  );
}
