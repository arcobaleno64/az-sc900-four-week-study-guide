import { readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
const root = resolve(process.cwd()),
  read = (p) => JSON.parse(readFileSync(join(root, p), "utf8"));
let bad = 0;
const fail = (m) => {
    console.error(`[錯誤] ${m}`);
    bad++;
  },
  ok = (v, m) => {
    if (!v) fail(m);
  },
  uniq = (a) => new Set(a).size === a.length;
const plan = read("data/study-plan.json"),
  q = read("data/questions.json"),
  g = read("data/glossary.json"),
  s = read("data/sources.json"),
  faq = read("data/faq.json"),
  qa = read("data/qa.json"),
  r = read("data/review.json"),
  m = read("data/exam-meta.json"),
  sum = read("data/content-summary.json");
const days = plan.weeks.flatMap((w) => w.days),
  terms = g.categories.flatMap((c) => c.terms);
ok(plan.weeks.length === 4, "四週計畫必須有 ４ 週。");
ok(days.length === 28, "四週計畫必須有 ２８ 天。");
ok(
  days.every(
    (d, i) =>
      d.day === i + 1 && d.title && d.reading && d.output && d.passCriteria,
  ),
  "每日資料不完整或日次不連續。",
);
ok(q.length === 50, "題庫必須有 ５０ 題。");
ok(
  q.filter((x) => x.exam === "AZ-900").length === 25 &&
    q.filter((x) => x.exam === "SC-900").length === 25,
  "兩科題數必須各 ２５ 題。",
);
ok(uniq(q.map((x) => x.id)), "題目 ID 重複。");
for (const x of q) {
  ok(x.options?.length === 4, `${x.id} 選項不是 ４ 個。`);
  ok(uniq(x.options.map((o) => o.id)), `${x.id} 選項 ID 重複。`);
  ok(
    x.options.some((o) => o.id === x.answer),
    `${x.id} 正確答案不存在。`,
  );
  ok(x.explanation && x.trap && x.domain, `${x.id} 缺解析、陷阱或領域。`);
}
ok(terms.length === 175, "名詞庫必須有 １７５ 個詞。");
ok(uniq(terms.map((x) => x.id)), "名詞 ID 重複。");
ok(
  s.length === 28 &&
    s.every((x) => /^https:\/\/learn\.microsoft\.com\//.test(x.url)),
  "官方來源數量或網址不符。",
);
ok(faq.length >= 20 && qa.length >= 20, "FAQ／Q&A 數量不足。");
ok(uniq([...faq, ...qa].map((x) => x.id)), "FAQ／Q&A ID 重複。");
ok(
  r.mustRemember["AZ-900"].length === 20 &&
    r.mustRemember["SC-900"].length === 25,
  "必背句數量不符。",
);
ok(
  m.exams.some((x) => x.code === "AZ-900" && x.effectiveDate === "2026-07-20"),
  "AZ-900 版本不符。",
);
ok(
  m.exams.some((x) => x.code === "SC-900" && x.effectiveDate === "2026-07-28"),
  "SC-900 版本不符。",
);
ok(
  sum.studyDays === days.length &&
    sum.questions === q.length &&
    sum.glossaryTerms === terms.length &&
    sum.officialSources === s.length,
  "內容摘要不一致。",
);
for (const f of ["start-here.md", "az-900.md", "sc-900.md", "cross-exam.md"])
  ok(statSync(join(root, "content/chapters", f)).size > 500, `${f} 過短。`);
if (bad) process.exit(1);
console.log(
  `[完成] 內容驗證通過：${days.length} 天、${q.length} 題、${terms.length} 個名詞、${s.length} 項官方來源、${faq.length} 題 FAQ、${qa.length} 題 Q&A。`,
);
