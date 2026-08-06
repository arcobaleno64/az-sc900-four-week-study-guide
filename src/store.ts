import { computed, reactive, watch } from "vue";
import type {
  Confidence,
  ExamCode,
  ProgressData,
  QuizAttempt,
  ThemeMode,
} from "./types";
import {
  applyAnswer,
  defaults,
  PROGRESS_KEY,
  PROGRESS_SCHEMA,
  sanitizeProgress,
} from "./progress-rules";

const themes: ThemeMode[] = ["system", "light", "dark"];

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function load(): ProgressData {
  try {
    const raw = localStorage.getItem(PROGRESS_KEY);
    return raw ? sanitizeProgress(JSON.parse(raw)) : structuredClone(defaults);
  } catch {
    return structuredClone(defaults);
  }
}

export const progress = reactive<ProgressData>(load());

watch(
  progress,
  (value) => localStorage.setItem(PROGRESS_KEY, JSON.stringify(value)),
  { deep: true },
);

export const completedCount = computed(() => progress.completedDays.length);
export const wrongCount = computed(() => progress.wrongQuestionIds.length);
export const luckyCount = computed(() => progress.luckyQuestionIds.length);

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

/** 記錄一次作答；狀態轉換規則見 progress-rules.ts 的 `applyAnswer`。 */
export function recordQuestion(
  id: string,
  correct: boolean,
  confidence?: Confidence,
): void {
  applyAnswer(progress, id, correct, confidence, new Date().toISOString());
}

export function addAttempt(attempt: QuizAttempt): void {
  progress.quizAttempts.unshift(attempt);
  progress.quizAttempts.splice(30);
}

export const clearWrongAnswers = () => {
  progress.wrongQuestionIds.splice(0);
};

export const clearLuckyQuestions = () => {
  progress.luckyQuestionIds.splice(0);
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
    schema: PROGRESS_SCHEMA,
    exportedAt: new Date().toISOString(),
    ...JSON.parse(JSON.stringify(progress)),
  };
}

export function importProgress(value: unknown): void {
  if (
    !isRecord(value) ||
    value.schema !== PROGRESS_SCHEMA ||
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
