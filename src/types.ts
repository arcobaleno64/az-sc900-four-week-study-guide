export type ExamCode = "AZ-900" | "SC-900";
export type RouteName =
  | "dashboard"
  | "plan"
  | "knowledge"
  | "glossary"
  | "quiz"
  | "faq"
  | "review"
  | "sources"
  | "settings";
export type ThemeMode = "system" | "light" | "dark";

export interface StudyDay {
  day: number;
  title: string;
  reading: string;
  output: string;
  passCriteria: string;
  exam: ExamCode | "共同";
}
export interface StudyWeek {
  id: string;
  week: number;
  title: string;
  days: StudyDay[];
}
export interface QuestionOption {
  id: string;
  text: string;
}
export interface Question {
  id: string;
  exam: ExamCode;
  number: number;
  question: string;
  options: QuestionOption[];
  answer: string;
  explanation: string;
  trap: string;
  domain: string;
  difficulty: string;
  keywords: string[];
}
export interface GlossaryTerm {
  id: string;
  term: string;
  explanation: string;
  exams: ExamCode[];
  category: string;
}
export interface SourceItem {
  id: string;
  title: string;
  url: string;
  publisher: string;
}
export interface FaqItem {
  id: string;
  category: string;
  question: string;
  answer: string;
  related?: string[];
  keyWords?: string[];
}
export interface ExamMeta {
  code: ExamCode;
  name: string;
  effectiveDate: string;
  durationMinutes: number;
  passingScore: number;
  skills: { name: string; weight: string }[];
  studyGuide: string;
  certificationPage: string;
}
export interface QuizAttempt {
  id: string;
  exam: ExamCode | "混合";
  mode: string;
  date: string;
  correct: number;
  total: number;
  score: number;
  domains: Record<string, { correct: number; total: number }>;
}
export interface QuestionStat {
  attempts: number;
  correct: number;
  wrong: number;
  lastAnsweredAt: string;
}
export interface ProgressData {
  version: number;
  completedDays: number[];
  dayNotes: Record<string, string>;
  favoriteTerms: string[];
  familiarTerms: string[];
  questionStats: Record<string, QuestionStat>;
  wrongQuestionIds: string[];
  quizAttempts: QuizAttempt[];
  reviewChecks: string[];
  examDates: Partial<Record<ExamCode, string>>;
  theme: ThemeMode;
}
export interface SearchResult {
  id: string;
  type: string;
  title: string;
  excerpt: string;
  route: RouteName;
  param?: string;
}
