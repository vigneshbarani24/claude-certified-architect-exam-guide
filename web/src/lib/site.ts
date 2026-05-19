/**
 * Static site constants. No runtime env needed — a plain constant keeps the
 * build fully static and works offline. Update if the canonical deploy URL
 * changes.
 *
 * SITE_NAME is the product *display* name only. The repository, LICENSE,
 * NOTICE, and CITATION keep their legal identity
 * (`claude-certified-architect-exam-guide`) — see Part B of the plan.
 */
export const SITE_URL = "https://ccaf-guide.vercel.app";

export const SITE_NAME = "Get Claude Certified";

/** Persistent guarded framing shown in nav, hero, footer, and metadata. */
export const SITE_LEGAL =
  "Independent · Unofficial · Not affiliated with Anthropic";

export const REPO_URL =
  "https://github.com/vigneshbarani24/claude-certified-architect-exam-guide";

/**
 * Canonical URL of the deployed mock exam, used for share/challenge links.
 * Derived from SITE_URL so it never hardcodes a stale `/web/` path.
 */
export const MOCK_EXAM_URL = `${SITE_URL}/mock-exam`;
