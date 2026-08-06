// 學習進度的純規則：清洗與狀態轉換。
// 這裡刻意不碰 Vue、localStorage 或 DOM，好讓規則能被直接單測；
// 反應式包裝、持久化與主題套用留在 store.ts。
import type {
  Confidence,
  ExamCode,
  ProgressData,
  QuestionStat,
  QuizAttempt,
  ThemeMode,
} from "./types.ts";

export const PROGRESS_KEY = "az-sc900-study-progress-v1";
export const PROGRESS_SCHEMA = "az-sc900-study-progress";
const themes: ThemeMode[] = ["system", "light", "dark"];
const examCodes: ExamCode[] = ["AZ-900", "SC-900"];

export const defaults: ProgressData = {
  version: 1,
  completedDays: [],
  dayNotes: {},
  favoriteTerms: [],
  familiarTerms: [],
  questionStats: {},
  wrongQuestionIds: [],
  luckyQuestionIds: [],
  confidenceLog: {},
  quizAttempts: [],
  reviewChecks: [],
  examDates: {},
  theme: "system",
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function uniqueStrings(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return [
    ...new Set(
      value.filter((item): item is string => typeof item === "string"),
    ),
  ];
}

function sanitizeQuestionStats(value: unknown): Record<string, QuestionStat> {
  if (!isRecord(value)) return {};
  const result: Record<string, QuestionStat> = {};
  for (const [id, raw] of Object.entries(value)) {
    if (!id || !isRecord(raw)) continue;
    const attempts = Number(raw.attempts);
    const correct = Number(raw.correct);
    const wrong = Number(raw.wrong);
    if (![attempts, correct, wrong].every(Number.isFinite)) continue;
    result[id] = {
      attempts: Math.max(0, Math.floor(attempts)),
      correct: Math.max(0, Math.floor(correct)),
      wrong: Math.max(0, Math.floor(wrong)),
      lastAnsweredAt:
        typeof raw.lastAnsweredAt === "string" ? raw.lastAnsweredAt : "",
    };
  }
  return result;
}

function sanitizeConfidence(value: unknown): Record<string, Confidence> {
  if (!isRecord(value)) return {};
  const result: Record<string, Confidence> = {};
  for (const [id, raw] of Object.entries(value)) {
    if (id && (raw === "sure" || raw === "unsure")) result[id] = raw;
  }
  return result;
}

function sanitizeDomains(
  value: unknown,
): Record<string, { correct: number; total: number }> {
  if (!isRecord(value)) return {};
  const result: Record<string, { correct: number; total: number }> = {};
  for (const [name, raw] of Object.entries(value)) {
    if (!name || !isRecord(raw)) continue;
    const correct = Number(raw.correct);
    const total = Number(raw.total);
    if (!Number.isFinite(correct) || !Number.isFinite(total)) continue;
    result[name] = {
      correct: Math.max(0, Math.floor(correct)),
      total: Math.max(0, Math.floor(total)),
    };
  }
  return result;
}

function sanitizeAttempts(value: unknown): QuizAttempt[] {
  if (!Array.isArray(value)) return [];
  const result: QuizAttempt[] = [];
  for (const raw of value) {
    if (!isRecord(raw)) continue;
    const exam = raw.exam;
    if (![...examCodes, "混合"].includes(String(exam) as ExamCode | "混合"))
      continue;
    const correct = Number(raw.correct);
    const total = Number(raw.total);
    const score = Number(raw.score);
    if (![correct, total, score].every(Number.isFinite)) continue;
    result.push({
      id: typeof raw.id === "string" ? raw.id : crypto.randomUUID(),
      exam: exam as ExamCode | "混合",
      mode: typeof raw.mode === "string" ? raw.mode : "練習",
      date: typeof raw.date === "string" ? raw.date : new Date().toISOString(),
      correct: Math.max(0, Math.floor(correct)),
      total: Math.max(0, Math.floor(total)),
      score: Math.max(0, Math.min(100, Math.round(score))),
      domains: sanitizeDomains(raw.domains),
    });
  }
  return result.slice(0, 30);
}

export function sanitizeProgress(value: unknown): ProgressData {
  if (!isRecord(value)) return structuredClone(defaults);

  const completedDays = Array.isArray(value.completedDays)
    ? [
        ...new Set(
          value.completedDays.filter(
            (day): day is number =>
              Number.isInteger(day) && Number(day) >= 1 && Number(day) <= 28,
          ),
        ),
      ].sort((a, b) => a - b)
    : [];

  const dayNotes: Record<string, string> = {};
  if (isRecord(value.dayNotes)) {
    for (const [day, note] of Object.entries(value.dayNotes)) {
      const numericDay = Number(day);
      if (
        Number.isInteger(numericDay) &&
        numericDay >= 1 &&
        numericDay <= 28 &&
        typeof note === "string"
      ) {
        dayNotes[day] = note.slice(0, 4000);
      }
    }
  }

  const examDates: Partial<Record<ExamCode, string>> = {};
  if (isRecord(value.examDates)) {
    for (const code of examCodes) {
      const date = value.examDates[code];
      if (typeof date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
        examDates[code] = date;
      }
    }
  }

  return {
    version: 1,
    completedDays,
    dayNotes,
    favoriteTerms: uniqueStrings(value.favoriteTerms),
    familiarTerms: uniqueStrings(value.familiarTerms),
    questionStats: sanitizeQuestionStats(value.questionStats),
    wrongQuestionIds: uniqueStrings(value.wrongQuestionIds),
    luckyQuestionIds: uniqueStrings(value.luckyQuestionIds),
    confidenceLog: sanitizeConfidence(value.confidenceLog),
    quizAttempts: sanitizeAttempts(value.quizAttempts),
    reviewChecks: uniqueStrings(value.reviewChecks),
    examDates,
    theme: themes.includes(value.theme as ThemeMode)
      ? (value.theme as ThemeMode)
      : "system",
  };
}

function drop(list: string[], id: string): void {
  const index = list.indexOf(id);
  if (index >= 0) list.splice(index, 1);
}

/**
 * 就地套用一次作答的所有狀態轉換。
 *
 * 錯題池與幸運答對池互斥：
 * - 答錯 → 進錯題池、離開幸運池。
 * - 答對且自評不確定 → 離開錯題池、進幸運池（分數看不出來的缺口）。
 * - 答對且自評有把握 → 兩個池都離開，這才算真的過關。
 * - 答對但沒有自評（關閉該功能）→ 離開錯題池，但**不動**幸運池；
 *   一次沒有把握度資訊的作答不足以推翻先前的紀錄。
 */
export function applyAnswer(
  data: ProgressData,
  id: string,
  correct: boolean,
  confidence: Confidence | undefined,
  now: string,
): void {
  const stat: QuestionStat = data.questionStats[id] ?? {
    attempts: 0,
    correct: 0,
    wrong: 0,
    lastAnsweredAt: "",
  };
  stat.attempts += 1;
  if (correct) {
    stat.correct += 1;
    drop(data.wrongQuestionIds, id);
  } else {
    stat.wrong += 1;
    if (!data.wrongQuestionIds.includes(id)) data.wrongQuestionIds.push(id);
  }
  if (confidence) data.confidenceLog[id] = confidence;
  if (!correct) {
    drop(data.luckyQuestionIds, id);
  } else if (confidence === "unsure") {
    if (!data.luckyQuestionIds.includes(id)) data.luckyQuestionIds.push(id);
  } else if (confidence === "sure") {
    drop(data.luckyQuestionIds, id);
  }
  stat.lastAnsweredAt = now;
  data.questionStats[id] = stat;
}
