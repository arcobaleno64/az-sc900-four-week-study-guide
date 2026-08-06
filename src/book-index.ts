import type { GlossaryTerm, Question } from "./types.ts";

/**
 * 索引不是名詞庫。
 *
 * 名詞庫解釋一個詞是什麼；索引告訴你這個詞在正文的哪裡出現過。
 * 因此每一條索引的內容全部由既有資料推導 —— 章節原文、題目的 keywords、
 * 名詞庫的詞條 —— 沒有一條是為了填版面而發明的。
 */
export interface ChapterSource {
  id: string;
  title: string;
  /** 在必備知識裡的章次，從 1 起算。 */
  number: number;
  raw: string;
}

export interface SectionRef {
  /** 「2.3」形式的節號。 */
  label: string;
  title: string;
  chapterId: string;
  anchor: string;
}

export interface IndexEntry {
  term: string;
  /** 出現該詞的章節，依章節順序。 */
  sections: SectionRef[];
  /** 名詞庫中對應詞條的 id，沒有對應則為空字串。 */
  glossaryId: string;
  /** 有多少題以此為關鍵字。 */
  questionCount: number;
  /** 排序分組：拉丁詞取首字母，其餘歸中文。 */
  group: string;
}

export const headingAnchor = (title: string): string =>
  title
    .toLowerCase()
    .replace(/[^a-z0-9一-鿿]+/g, "-")
    .replace(/(^-|-$)/g, "");

/**
 * 讀出一章的節，**沿用教材原文已經寫好的編號**。
 *
 * 教材的標題本來就帶著參考書的章節號，而且是跨檔連號的（AZ-900 是第 1～3 章、
 * SC-900 第 4～7 章、雙科比較第 8 章）。自己再產一套編號會與正文打架，
 * 所以這裡是解析而不是發明；沒有編號的前言標題就維持沒有編號。
 */
// 教材用兩種寫法標號：h2 多半是「第 N 章」，但雙科比較那一章直接寫「8.1」。
// 兩種都認，才不會漏掉整整一章。
const NUMBER_FORMS = [
  /^第\s*(\d+)\s*章[　\s]*(.*)$/,
  /^(\d+\.\d+)[　\s]+(.*)$/,
];

export function sectionsOf(chapter: ChapterSource): SectionRef[] {
  const sections: SectionRef[] = [];
  for (const line of chapter.raw.split("\n")) {
    const match = /^(#{2,3})\s+(.*)$/.exec(line);
    if (!match) continue;
    const heading = match[2].trim();
    if (!heading) continue;
    const numbered = NUMBER_FORMS.map((form) => form.exec(heading)).find(
      Boolean,
    );
    const label = numbered ? numbered[1] : "";
    const title = numbered ? numbered[2].trim() : heading;
    sections.push({
      label,
      title,
      chapterId: chapter.id,
      anchor: headingAnchor(heading),
    });
  }
  return sections;
}

/** 該節的內文範圍，用來判斷一個詞出現在哪一節。 */
function sectionBodies(
  chapter: ChapterSource,
): { ref: SectionRef; body: string }[] {
  const refs = sectionsOf(chapter);
  if (!refs.length) return [];
  const lines = chapter.raw.split("\n");
  const starts: number[] = [];
  let seen = 0;
  lines.forEach((line, index) => {
    if (/^#{2,3}\s+\S/.test(line)) {
      starts[seen] = index;
      seen += 1;
    }
  });
  return refs.map((ref, index) => ({
    ref,
    body: lines
      .slice(starts[index], starts[index + 1] ?? lines.length)
      .join("\n"),
  }));
}

const LATIN = /^[A-Za-z]/;

function groupOf(term: string): string {
  return LATIN.test(term) ? term[0].toUpperCase() : "中文";
}

/**
 * 建索引。詞源有兩個：名詞庫的所有詞條，以及題目的 keywords。
 * 兩者合併去重後，回頭到章節原文裡找出現位置。
 */
export function buildIndex(
  chapters: ChapterSource[],
  terms: GlossaryTerm[],
  questions: Question[],
): IndexEntry[] {
  const glossaryByTerm = new Map<string, string>();
  for (const term of terms) {
    const clean = term.term.trim();
    if (clean && !glossaryByTerm.has(clean)) glossaryByTerm.set(clean, term.id);
  }

  const questionCounts = new Map<string, number>();
  for (const question of questions) {
    for (const keyword of new Set(question.keywords)) {
      const clean = keyword.trim();
      if (clean)
        questionCounts.set(clean, (questionCounts.get(clean) ?? 0) + 1);
    }
  }

  const bodies = chapters.flatMap(sectionBodies);
  const candidates = new Set([
    ...glossaryByTerm.keys(),
    ...questionCounts.keys(),
  ]);

  const entries: IndexEntry[] = [];
  for (const term of candidates) {
    // 過短的詞會在內文裡到處誤命中，索引價值反而是負的。
    const searchable = term.length >= 2;
    const sections = searchable
      ? bodies
          .filter((item) => item.body.includes(term))
          .map((item) => item.ref)
      : [];
    const questionCount = questionCounts.get(term) ?? 0;
    const glossaryId = glossaryByTerm.get(term) ?? "";
    // 三個來源都掛零的詞不該進索引 —— 索引只收得到位置的詞。
    if (!sections.length && !questionCount && !glossaryId) continue;
    entries.push({
      term,
      sections,
      glossaryId,
      questionCount,
      group: groupOf(term),
    });
  }

  return entries.sort(compareEntries);
}

/**
 * 拉丁詞在前、依字母序；中文在後。
 * 中文以碼位排序 —— CJK 統一表意文字的碼位順序本身就接近部首筆畫序，
 * 不需要另外掛一份筆畫表。
 */
function compareEntries(a: IndexEntry, b: IndexEntry): number {
  const aLatin = a.group !== "中文";
  const bLatin = b.group !== "中文";
  if (aLatin !== bLatin) return aLatin ? -1 : 1;
  if (aLatin) return a.term.localeCompare(b.term, "en");
  return a.term < b.term ? -1 : a.term > b.term ? 1 : 0;
}

/** 依分組切段，供索引頁加上 A／B／C／中文 的小標。 */
export function groupIndex(
  entries: IndexEntry[],
): { group: string; entries: IndexEntry[] }[] {
  const groups: { group: string; entries: IndexEntry[] }[] = [];
  for (const entry of entries) {
    const last = groups.at(-1);
    if (last && last.group === entry.group) last.entries.push(entry);
    else groups.push({ group: entry.group, entries: [entry] });
  }
  return groups;
}
