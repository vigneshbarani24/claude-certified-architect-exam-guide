import { ChevronDown } from "lucide-react";

interface QA {
  q: string;
  a: string;
}

// Original Q&As written for this project. No prose copied from third parties.
const FAQ: QA[] = [
  {
    q: "Is this an official Anthropic certification?",
    a: "No. This is an independent, community-built study system. It is not affiliated with, endorsed by, or sponsored by Anthropic, and it does not issue any certification. The official exam and credential belong to Anthropic; \"Get Claude Certified\" describes the purpose of this study tool.",
  },
  {
    q: "What does it cost, and do I need an account?",
    a: "Nothing, and no. Every page is free and prerendered as static files. There is no sign-up, no paywall, and no upsell — all study progress is computed and stored only in your browser.",
  },
  {
    q: "How does the readiness dashboard work without tracking me?",
    a: "Your mastery, streak, due reviews, and rank are derived entirely on-device from your local activity. Nothing is sent to a server — there is no analytics, no database, and no network call at runtime. Clear your browser storage and it resets to zero.",
  },
  {
    q: "Where does the content come from?",
    a: "The study guide adapts a CC BY 4.0 independent study booklet by Daron Yondem with attribution, and the exam structure (five domains, weights, task counts) is factual information from Anthropic's public exam guide. Flashcards and practice questions are original, docs-grounded, and licensed CC BY 4.0. No real exam questions are reproduced or paraphrased.",
  },
  {
    q: "How should I actually use it to prepare?",
    a: "Take the diagnostic to surface your weakest domains, work the curriculum chapter by chapter, drill flashcards with spaced repetition so facts stick, and run scenario-based mock exams under exam-like conditions. The dashboard routes each session toward your lowest-mastery, highest-weight domain.",
  },
  {
    q: "Does it work offline?",
    a: "Yes, once the page has loaded. Because the whole site is static with no backend, it runs comfortably on a free hosting tier and keeps working without a connection.",
  },
];

export function Faq() {
  return (
    <div className="space-y-3">
      {FAQ.map((item) => (
        <details
          key={item.q}
          className="group rounded-lg border border-border bg-card transition-colors open:border-claude-orange/40"
        >
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-5 font-display text-lg [&::-webkit-details-marker]:hidden">
            {item.q}
            <ChevronDown className="h-5 w-5 shrink-0 text-claude-orange transition-transform group-open:rotate-180 motion-reduce:transition-none" />
          </summary>
          <p className="px-5 pb-5 text-sm leading-relaxed text-muted-foreground">
            {item.a}
          </p>
        </details>
      ))}
    </div>
  );
}
