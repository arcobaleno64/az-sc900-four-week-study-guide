import planData from "../data/study-plan.json";
import questionData from "../data/questions.json";
import glossaryData from "../data/glossary.json";
import sourcesData from "../data/sources.json";
import faqData from "../data/faq.json";
import qaData from "../data/qa.json";
import reviewData from "../data/review.json";
import metaData from "../data/exam-meta.json";
import summaryData from "../data/content-summary.json";
import startHere from "../content/chapters/start-here.md?raw";
import az900 from "../content/chapters/az-900.md?raw";
import sc900 from "../content/chapters/sc-900.md?raw";
import crossExam from "../content/chapters/cross-exam.md?raw";
import type {
  ExamMeta,
  FaqItem,
  GlossaryTerm,
  Question,
  SearchResult,
  SourceItem,
  StudyDay,
  StudyWeek,
} from "./types";
import { normalize } from "./utils";
export const studyPlan = planData as {
  version: string;
  weeks: StudyWeek[];
  wrongAnswerMethod: { type: string; symptom: string; remedy: string }[];
};
export const studyDays = studyPlan.weeks.flatMap((w) => w.days) as StudyDay[];
export const questions = questionData as Question[];
export const glossary = glossaryData as {
  version: string;
  categories: { id: string; title: string; terms: GlossaryTerm[] }[];
};
export const terms = glossary.categories.flatMap((c) => c.terms);
export const sources = sourcesData as SourceItem[];
export const faqs = faqData as FaqItem[];
export const qas = qaData as FaqItem[];
export const review = reviewData as {
  mustRemember: Record<string, string[]>;
  cheatsheet: { combination: string; summary: string }[];
  examDayChecklist: string[];
};
export const examMeta = metaData as {
  lastVerified: string;
  disclaimer: string;
  exams: ExamMeta[];
};
export const summary = summaryData;
export const chapters = [
  { id: "start-here", title: "開始使用", exam: "共同", raw: startHere },
  { id: "az-900", title: "AZ-900 必備知識", exam: "AZ-900", raw: az900 },
  { id: "sc-900", title: "SC-900 必備知識", exam: "SC-900", raw: sc900 },
  {
    id: "cross-exam",
    title: "雙科比較與易混淆辨析",
    exam: "共同",
    raw: crossExam,
  },
] as const;
export function searchContent(query: string): SearchResult[] {
  const q = normalize(query.trim());
  if (!q) return [];
  const hit = (...values: string[]) => normalize(values.join(" ")).includes(q);
  const out: SearchResult[] = [];
  for (const t of terms)
    if (hit(t.term, t.explanation, t.category))
      out.push({
        id: t.id,
        type: "名詞",
        title: t.term,
        excerpt: t.explanation,
        route: "glossary",
        param: t.id,
      });
  for (const item of [...faqs, ...qas])
    if (hit(item.question, item.answer, item.category))
      out.push({
        id: item.id,
        type: "問答",
        title: item.question,
        excerpt: item.answer,
        route: "faq",
        param: item.id,
      });
  for (const s of sources)
    if (hit(s.title, s.id))
      out.push({
        id: s.id,
        type: "來源",
        title: s.title,
        excerpt: s.url,
        route: "sources",
        param: s.id,
      });
  for (const item of questions)
    if (hit(item.question, item.explanation, item.domain, item.trap))
      out.push({
        id: item.id,
        type: "題目",
        title: `${item.exam} 第 ${item.number} 題`,
        excerpt: item.question,
        route: "quiz",
        param: item.id,
      });
  for (const c of chapters)
    if (hit(c.title, c.raw))
      out.push({
        id: c.id,
        type: "章節",
        title: c.title,
        excerpt: "在教材章節內找到相關內容。",
        route: "knowledge",
        param: c.id,
      });
  return out.slice(0, 50);
}
