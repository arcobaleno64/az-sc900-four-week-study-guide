import assert from "node:assert/strict";
import test from "node:test";
import {
  buildIndex,
  groupIndex,
  headingAnchor,
  sectionsOf,
} from "../src/book-index.ts";
import type { GlossaryTerm, Question } from "../src/types.ts";

const chapter = {
  id: "az-900",
  number: 2,
  title: "AZ-900 必備知識",
  raw: [
    "# AZ-900 必備知識",
    "",
    "## 第 1 章　雲端概念",
    "",
    "雲端運算的基本定義。",
    "",
    "### 1.1　一句話定位",
    "",
    "共同責任模型決定誰負責什麼。",
    "",
    "### 1.2　部署模型",
    "",
    "公有雲、私有雲與混合雲。",
    "",
    "## 第 2 章　Azure 架構",
    "",
    "Availability Zone 是區域內的獨立實體位置。",
  ].join("\n"),
};

const frontMatter = {
  id: "start-here",
  number: 1,
  title: "開始使用",
  raw: ["# 開始使用", "", "## 本書使用方法", "", "先讀這裡。"].join("\n"),
};

const crossExam = {
  id: "cross-exam",
  number: 4,
  title: "雙科比較",
  raw: ["# 雙科比較", "", "## 8.1　重疊與差異", "", "兩科的交集。"].join("\n"),
};

const terms = [
  {
    id: "t-shared",
    term: "共同責任模型",
    explanation: "誰負責什麼。",
    exams: ["AZ-900"],
    category: "A",
  },
  {
    id: "t-az",
    term: "Availability Zone",
    explanation: "區域內的獨立位置。",
    exams: ["AZ-900"],
    category: "A",
  },
  {
    id: "t-unused",
    term: "從未出現的詞",
    explanation: "正文沒提過。",
    exams: ["AZ-900"],
    category: "A",
  },
] as GlossaryTerm[];

const questions = [
  { keywords: ["共同責任模型", "IaaS"] },
  { keywords: ["共同責任模型"] },
  { keywords: ["公有雲"] },
] as Question[];

test("節號沿用教材原文寫好的編號，不自己另生一套", () => {
  const sections = sectionsOf(chapter);
  assert.deepEqual(
    sections.map((s) => `${s.label}|${s.title}`),
    ["1|雲端概念", "1.1|一句話定位", "1.2|部署模型", "2|Azure 架構"],
  );
});

test("「8.1」這種直接寫小數的 h2 也要認得", () => {
  assert.deepEqual(
    sectionsOf(crossExam).map((s) => `${s.label}|${s.title}`),
    ["8.1|重疊與差異"],
  );
});

test("沒有編號的前言標題保留原文，不會被硬掛號碼", () => {
  const sections = sectionsOf(frontMatter);
  assert.equal(sections.length, 1);
  assert.equal(sections[0].label, "");
  assert.equal(sections[0].title, "本書使用方法");
});

test("索引收錄名詞庫與題目關鍵字，並指回出現的節", () => {
  const index = buildIndex([chapter, frontMatter], terms, questions);
  const shared = index.find((e) => e.term === "共同責任模型");
  assert.ok(shared, "共同責任模型應在索引中");
  assert.deepEqual(
    shared.sections.map((s) => s.label),
    ["1.1"],
    "應指到實際出現的那一節，而不是整章",
  );
  assert.equal(shared.glossaryId, "t-shared");
  assert.equal(shared.questionCount, 2);
});

test("只出現在題目關鍵字、正文沒提過的詞仍會收錄", () => {
  const index = buildIndex([chapter], terms, questions);
  const iaas = index.find((e) => e.term === "IaaS");
  assert.ok(iaas);
  assert.equal(iaas.sections.length, 0);
  assert.equal(iaas.questionCount, 1);
  assert.equal(iaas.glossaryId, "");
});

test("三個來源都掛零的詞不進索引", () => {
  const index = buildIndex(
    [chapter],
    [
      {
        id: "t-ghost",
        term: "幽靈詞",
        explanation: "",
        exams: [],
        category: "",
      } as unknown as GlossaryTerm,
    ],
    [],
  );
  // 名詞庫有詞條就算有位置，所以幽靈詞仍在；真正被排除的是完全沒來源的詞。
  assert.equal(index.length, 1);
  assert.equal(index[0].glossaryId, "t-ghost");
  assert.equal(buildIndex([chapter], [], []).length, 0);
});

test("拉丁詞排在中文之前，且各自照序", () => {
  const index = buildIndex([chapter], terms, questions);
  const groups = groupIndex(index);
  const order = groups.map((g) => g.group);
  assert.equal(order.at(-1), "中文", "中文條目必須排在最後");
  assert.ok(
    order.slice(0, -1).every((g) => /^[A-Z]$/.test(g)),
    `拉丁分組應為單一字母，實際為 ${order.join(",")}`,
  );
  const latin = index.filter((e) => e.group !== "中文").map((e) => e.term);
  assert.deepEqual(
    latin,
    [...latin].sort((a, b) => a.localeCompare(b, "en")),
  );
});

test("錨點與標題一一對應，供目錄跳轉使用", () => {
  assert.equal(headingAnchor("第 1 章　雲端概念"), "第-1-章-雲端概念");
  assert.equal(headingAnchor("1.1　一句話定位"), "1-1-一句話定位");
});
