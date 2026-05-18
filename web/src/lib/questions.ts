import rawQuestions from "@/data/questions.json";

export interface QuestionOption {
  label: string;
  text: string;
}

export interface Question {
  id: string;
  scenario: string;
  domain: number;
  stem: string;
  options: QuestionOption[];
  correct: string;
  explanation: string;
  tags: string[];
}

const questions: Question[] = (rawQuestions as Question[]).filter(
  (q) => typeof q.id === "string" && Array.isArray(q.options)
);

export function getAllQuestions(): Question[] {
  return questions;
}

export function getScenarios(): string[] {
  return Array.from(new Set(questions.map((q) => q.scenario)));
}

export function filterByScenarios(scenarios: string[]): Question[] {
  if (scenarios.length === 0) return questions;
  const set = new Set(scenarios);
  return questions.filter((q) => set.has(q.scenario));
}

export function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}
