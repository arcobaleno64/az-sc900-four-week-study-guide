import type { QuestionOption } from "./types";
export const clamp = (n: number, min: number, max: number) =>
  Math.max(min, Math.min(max, n));
export const percent = (part: number, total: number) =>
  total ? Math.round((part / total) * 100) : 0;
export const formatDate = (value: string) =>
  new Intl.DateTimeFormat("zh-TW", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(`${value}T00:00:00`));
export const formatDateTime = (value: string) =>
  new Intl.DateTimeFormat("zh-TW", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
export const daysUntil = (value?: string) =>
  value
    ? Math.ceil(
        (new Date(`${value}T00:00:00`).getTime() - Date.now()) / 86400000,
      )
    : null;
export function shuffled<T>(input: T[]): T[] {
  const result = [...input];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
export const optionText = (options: QuestionOption[], id?: string) =>
  options.find((o) => o.id === id)?.text ?? "未作答";
export const normalize = (value: string) =>
  value.toLocaleLowerCase("zh-TW").normalize("NFKC");
export const escapeRegExp = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
export function decodeRouteParam(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return "";
  }
}
export function downloadJson(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
export const makeId = (prefix: string) =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
