import { computed, reactive, watch } from "vue";
import type {
  ExamCode,
  ProgressData,
  QuestionStat,
  QuizAttempt,
  ThemeMode,
} from "./types";

const KEY = "az-sc900-study-progress-v1";
const themes: ThemeMode[] = ["system", "light", "dark"];
const examCodes: ExamCode[] = ["AZ-900", "SC-900"];

const defaults: ProgressData = {
  version: 1,
  completedDays: [],
  dayNotes: {},
  favoriteTerms: [],
  familiarTerms: [],
  questionStats: {},
  wrongQuestionIds: [],
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

function sanitizeProgress(value: unknown): ProgressData {
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
    quizAttempts: sanitizeAttempts(value.quizAttempts),
    reviewChecks: uniqueStrings(value.reviewChecks),
    examDates,
    theme: themes.includes(value.theme as ThemeMode)
      ? (value.theme as ThemeMode)
      : "system",
  };
}

function load(): ProgressData {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? sanitizeProgress(JSON.parse(raw)) : structuredClone(defaults);
  } catch {
    return structuredClone(defaults);
  }
}

export const progress = reactive<ProgressData>(load());

watch(progress, (value) => localStorage.setItem(KEY, JSON.stringify(value)), {
  deep: true,
});

export const completedCount = computed(() => progress.completedDays.length);
export const wrongCount = computed(() => progress.wrongQuestionIds.length);

function toggleArray<T extends string | number>(list: T[], value: T): void {
  const index = list.indexOf(value);
  if (index >= 0) list.splice(index, 1);
  else list.push(value);
}

export const toggleDay = (day: number) =>
  toggleArray(progress.completedDays, day);

export const setDayNote = (day: number, note: string) => {
  progress.dayNotes[String(day)] = note.slice(0, 4000);
};

export const toggleFavoriteTerm = (id: string) =>
  toggleArray(progress.favoriteTerms, id);

export const toggleFamiliarTerm = (id: string) =>
  toggleArray(progress.familiarTerms, id);

export const toggleReviewCheck = (id: string) =>
  toggleArray(progress.reviewChecks, id);

export function recordQuestion(id: string, correct: boolean): void {
  const stat: QuestionStat = progress.questionStats[id] ?? {
    attempts: 0,
    correct: 0,
    wrong: 0,
    lastAnsweredAt: "",
  };
  stat.attempts += 1;
  if (correct) {
    stat.correct += 1;
    const index = progress.wrongQuestionIds.indexOf(id);
    if (index >= 0) progress.wrongQuestionIds.splice(index, 1);
  } else {
    stat.wrong += 1;
    if (!progress.wrongQuestionIds.includes(id))
      progress.wrongQuestionIds.push(id);
  }
  stat.lastAnsweredAt = new Date().toISOString();
  progress.questionStats[id] = stat;
}

export function addAttempt(attempt: QuizAttempt): void {
  progress.quizAttempts.unshift(attempt);
  progress.quizAttempts.splice(30);
}

export const clearWrongAnswers = () => {
  progress.wrongQuestionIds.splice(0);
};

export function setTheme(theme: ThemeMode): void {
  progress.theme = theme;
  applyTheme();
}

export function applyTheme(): void {
  const dark =
    progress.theme === "dark" ||
    (progress.theme === "system" &&
      matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.dataset.theme = dark ? "dark" : "light";
  document.documentElement.style.colorScheme = dark ? "dark" : "light";
}

export function cycleTheme(): void {
  setTheme(themes[(themes.indexOf(progress.theme) + 1) % themes.length]);
}

export const setExamDate = (exam: ExamCode, date: string) => {
  if (date) progress.examDates[exam] = date;
  else delete progress.examDates[exam];
};

export function exportProgress() {
  return {
    schema: "az-sc900-study-progress",
    exportedAt: new Date().toISOString(),
    ...JSON.parse(JSON.stringify(progress)),
  };
}

export function importProgress(value: unknown): void {
  if (
    !isRecord(value) ||
    value.schema !== "az-sc900-study-progress" ||
    value.version !== 1
  ) {
    throw new Error("檔案格式或版本不是本網站支援的學習紀錄。");
  }
  Object.assign(progress, sanitizeProgress(value));
  applyTheme();
}

export function resetProgress(): void {
  Object.assign(progress, structuredClone(defaults));
  applyTheme();
}

applyTheme();
matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
  if (progress.theme === "system") applyTheme();
});
