import { reactive } from "vue";
import type { RouteName } from "./types";
import { decodeRouteParam } from "./utils";
export const route = reactive<{
  name: RouteName;
  param: string;
  query: Record<string, string>;
}>({ name: "dashboard", param: "", query: {} });
const names = new Set<RouteName>([
  "dashboard",
  "plan",
  "knowledge",
  "glossary",
  "quiz",
  "faq",
  "review",
  "sources",
  "settings",
]);
function parse() {
  const raw = location.hash.replace(/^#\/?/, "");
  const [path, search = ""] = raw.split("?");
  const [candidate = "dashboard", param = ""] = path.split("/");
  route.name = names.has(candidate as RouteName)
    ? (candidate as RouteName)
    : "dashboard";
  route.param = decodeRouteParam(param);
  route.query = Object.fromEntries(new URLSearchParams(search));
}
export function navigate(
  name: RouteName,
  param = "",
  query: Record<string, string | number | boolean | undefined> = {},
) {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) {
    if (v !== undefined && v !== "") qs.set(k, String(v));
  }
  const next = `#/${name}${param ? `/${encodeURIComponent(param)}` : ""}${qs.size ? `?${qs}` : ""}`;
  if (location.hash === next) parse();
  else location.hash = next;
}
window.addEventListener("hashchange", parse);
if (!location.hash) location.hash = "#/dashboard";
parse();
export const routeTitles: Record<RouteName, string> = {
  dashboard: "總覽",
  plan: "四週計畫",
  knowledge: "必備知識",
  glossary: "名詞庫",
  quiz: "模擬題",
  faq: "FAQ／Q&A",
  review: "考前速查",
  sources: "官方來源",
  settings: "設定",
};
