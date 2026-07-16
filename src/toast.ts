import { reactive } from "vue";
export interface Toast {
  id: number;
  message: string;
  tone: "info" | "success" | "warning";
}
export const toasts = reactive<Toast[]>([]);
let next = 1;
export function showToast(message: string, tone: Toast["tone"] = "info") {
  const id = next++;
  toasts.push({ id, message, tone });
  setTimeout(() => {
    const i = toasts.findIndex((x) => x.id === id);
    if (i >= 0) toasts.splice(i, 1);
  }, 3300);
}
