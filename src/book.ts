import type { RouteName } from "./types.ts";

/**
 * 全書結構。
 *
 * 這份網站是一本參考書，四週計畫是走完它的一條路線，不是它的書名。
 * 部次編號讓每個章節可以被指涉（「見第 3 章」），也取代了原本
 * 總／週／知／詞 這套需要讀者自行解碼的自造縮寫。
 */
export interface BookEntry {
  name: RouteName;
  label: string;
  /** 側欄與頁首顯示的部次記號；設定頁不屬於正文，留空。 */
  mark: string;
}
export interface BookPart {
  title: string;
  entries: BookEntry[];
}

export const bookParts: BookPart[] = [
  {
    title: "前言",
    entries: [{ name: "dashboard", label: "總覽", mark: "0" }],
  },
  {
    title: "正文",
    entries: [
      { name: "knowledge", label: "必備知識", mark: "1" },
      { name: "glossary", label: "名詞庫", mark: "2" },
      { name: "quiz", label: "模擬題", mark: "3" },
      { name: "plan", label: "四週讀書計畫", mark: "4" },
    ],
  },
  {
    title: "附錄",
    entries: [
      { name: "review", label: "考前速查", mark: "A" },
      { name: "faq", label: "FAQ／Q&A", mark: "B" },
      { name: "sources", label: "官方來源", mark: "C" },
      { name: "bookIndex", label: "索引", mark: "D" },
    ],
  },
];

export const bookEntries: BookEntry[] = bookParts.flatMap(
  (part) => part.entries,
);

const byName = new Map(bookEntries.map((entry) => [entry.name, entry]));

export const entryOf = (name: RouteName): BookEntry | undefined =>
  byName.get(name);

const partOf = new Map(
  bookParts.flatMap((part) =>
    part.entries.map((entry) => [entry.name, part.title] as const),
  ),
);

/**
 * 書眉標示，例如「正文 1」「附錄 D」。
 *
 * 刻意不寫成「第 1 章」——教材原文自己就有第 1～8 章的編號，
 * 兩套「章」會直接撞名。這裡標的是書的部次，不是章次。
 */
export function markLabel(name: RouteName): string {
  const entry = byName.get(name);
  const part = partOf.get(name);
  if (!entry || !part) return "";
  return part === "前言" ? part : `${part} ${entry.mark}`;
}
