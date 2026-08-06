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
  | "bookIndex"
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
export type QuestionType =
  "single" | "multiple" | "true-false" | "yes-no-matrix" | "dropdown";
export type DifficultyLevel = "基礎" | "情境" | "進階";
/** 矩陣題以 statementId → 是否正確；下拉題以 segmentId → 選項 ID 作答。 */
export type CompositeAnswer = Record<string, string | boolean>;
export type QuestionAnswer = string | string[] | boolean | CompositeAnswer;
interface QuestionBase {
  id: string;
  exam: ExamCode;
  number: number;
  sourceIds: string[];
  question: string;
  explanation: string;
  trap: string;
  domain: string;
  difficulty: DifficultyLevel;
  keywords: string[];
  /** 同一觀念的變體題共用，供抽題時同群只取一題，避免互相提示答案。 */
  conceptId: string;
  /** 隸屬的情境案例組；同組題目一律整組出現且相鄰。 */
  caseId?: string;
}
/** 選項 ID → 該選項為何正確或為何錯誤。矩陣題與下拉題改由各子項自帶理由。 */
type OptionRationales = { optionRationales: Record<string, string> };
export interface SingleQuestion extends QuestionBase, OptionRationales {
  type: "single";
  options: QuestionOption[];
  answer: string;
}
export interface MultipleQuestion extends QuestionBase, OptionRationales {
  type: "multiple";
  options: QuestionOption[];
  answer: string[];
}
export interface TrueFalseQuestion extends QuestionBase, OptionRationales {
  type: "true-false";
  answer: boolean;
}
export interface MatrixStatement {
  id: string;
  text: string;
  answer: boolean;
  rationale: string;
}
export interface YesNoMatrixQuestion extends QuestionBase {
  type: "yes-no-matrix";
  statements: MatrixStatement[];
}
export interface DropdownSegment {
  id: string;
  label: string;
  options: QuestionOption[];
  answer: string;
  rationale: string;
}
export interface DropdownQuestion extends QuestionBase {
  type: "dropdown";
  /** 含 {segmentId} 佔位符的完整句子，佔位符在作答時換成下拉選單。 */
  template: string;
  segments: DropdownSegment[];
}
export type Question =
  | SingleQuestion
  | MultipleQuestion
  | TrueFalseQuestion
  | YesNoMatrixQuestion
  | DropdownQuestion;
/** 有固定選項清單、可直接洗牌的題型。 */
export type OptionQuestion =
  SingleQuestion | MultipleQuestion | TrueFalseQuestion;
/**
 * `scenario` 是共用背景的情境案例組。
 * `solution-set` 是 Microsoft 最具代表性的重複情境題組：同一個目標下，
 * 每題提出**不同的解法**並各自獨立計分——可能多個成立，也可能都不成立。
 * 它比是非矩陣難，因為你看不到其他解法可以互相對照。
 */
export type CaseKind = "scenario" | "solution-set";
export interface CaseStudy {
  id: string;
  exam: ExamCode;
  kind?: CaseKind;
  title: string;
  scenario: string;
  requirements: string[];
  sourceIds: string[];
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
/** 作答前的自評把握度；用來把「猜對的」與「真的會」分開。 */
export type Confidence = "sure" | "unsure";
export interface ProgressData {
  version: number;
  completedDays: number[];
  dayNotes: Record<string, string>;
  favoriteTerms: string[];
  familiarTerms: string[];
  questionStats: Record<string, QuestionStat>;
  wrongQuestionIds: string[];
  /** 答對但自評不確定；分數看不出來的缺口。 */
  luckyQuestionIds: string[];
  confidenceLog: Record<string, Confidence>;
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
