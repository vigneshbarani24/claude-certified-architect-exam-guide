// Prebuild: copy NotebookLM markdown bundles and real flashcard data into the
// web app if they exist in the monorepo. All steps degrade gracefully when
// source files are missing so `npm run build` always succeeds.
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.resolve(__dirname, "..");
const repoRoot = path.resolve(webRoot, "..");

async function exists(p) {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

async function copyNotebookBundles() {
  const src = path.join(repoRoot, "notebooklm");
  const dest = path.join(webRoot, "public", "notebooklm");
  if (!(await exists(src))) {
    console.log("[copy-bundles] notebooklm/ not found — skipping bundle copy.");
    return;
  }
  await fs.mkdir(dest, { recursive: true });
  const entries = await fs.readdir(src);
  const mds = entries.filter(
    (f) =>
      f.toLowerCase().endsWith(".md") &&
      f.toLowerCase() !== "readme.md"
  );
  if (mds.length === 0) {
    console.log("[copy-bundles] no .md bundles in notebooklm/ — skipping.");
    return;
  }
  for (const f of mds) {
    await fs.copyFile(path.join(src, f), path.join(dest, f));
  }
  console.log(`[copy-bundles] copied ${mds.length} NotebookLM bundle(s).`);
}

async function copyFlashcardData() {
  const src = path.join(repoRoot, "flashcards", "all-domains.json");
  const dest = path.join(webRoot, "src", "data", "flashcards.json");
  if (!(await exists(src))) {
    console.log(
      "[copy-bundles] flashcards/all-domains.json not found — keeping placeholder data."
    );
    return;
  }
  try {
    const text = await fs.readFile(src, "utf8");
    JSON.parse(text); // validate before overwriting
    await fs.copyFile(src, dest);
    console.log("[copy-bundles] copied real flashcards/all-domains.json.");
  } catch (err) {
    console.log(
      `[copy-bundles] all-domains.json invalid JSON — keeping placeholder. (${err.message})`
    );
  }
}

async function copyQuestionData() {
  const src = path.join(repoRoot, "questions", "all-questions.json");
  const dest = path.join(webRoot, "src", "data", "questions.json");
  if (!(await exists(src))) {
    console.log(
      "[copy-bundles] questions/all-questions.json not found — keeping placeholder data."
    );
    return;
  }
  try {
    const text = await fs.readFile(src, "utf8");
    JSON.parse(text); // validate before overwriting
    await fs.copyFile(src, dest);
    console.log("[copy-bundles] copied real questions/all-questions.json.");
  } catch (err) {
    console.log(
      `[copy-bundles] all-questions.json invalid JSON — keeping placeholder. (${err.message})`
    );
  }
}

// Build-time only: bake the GitHub star count into a static JSON file so the
// landing page can show honest social proof WITHOUT any runtime network call.
// Exactly one unauthenticated request; any failure (offline CI, rate limit)
// writes { stars: null } and the UI omits the figure gracefully.
async function writeSiteStats() {
  const dest = path.join(webRoot, "src", "data", "site-stats.json");
  const repoApi =
    "https://api.github.com/repos/vigneshbarani24/claude-certified-architect-exam-guide";
  const generatedAtISO = new Date().toISOString();
  let stars = null;
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 8000);
    const res = await fetch(repoApi, {
      headers: {
        Accept: "application/vnd.github+json",
        "User-Agent": "ccaf-guide-build-script",
      },
      signal: ctrl.signal,
    });
    clearTimeout(t);
    if (res.ok) {
      const data = await res.json();
      if (typeof data.stargazers_count === "number") {
        stars = data.stargazers_count;
      }
    }
  } catch (err) {
    console.log(
      `[copy-bundles] GitHub stars fetch failed — writing null. (${err.message})`
    );
  }
  await fs.mkdir(path.dirname(dest), { recursive: true });
  await fs.writeFile(
    dest,
    JSON.stringify({ stars, generatedAtISO }, null, 2) + "\n",
    "utf8"
  );
  console.log(`[copy-bundles] wrote site-stats.json (stars: ${stars}).`);
}

await copyNotebookBundles();
await copyFlashcardData();
await copyQuestionData();
await writeSiteStats();
