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
  uniq = (a) => new Set(a).size === a.length,
  nonEmptyString = (value) =>
    typeof value === "string" && value.trim().length > 0;
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
  terms = g.categories.flatMap((c) => c.terms),
  examCodes = m.exams.map((x) => x.code),
  sourceIds = new Set(s.map((x) => x.id)),
  questionTypes = new Set(["single", "multiple", "true-false"]);
ok(plan.weeks.length === 4, "四週計畫必須有 ４ 週。");
ok(days.length === 28, "四週計畫必須有 ２８ 天。");
ok(
  days.every(
    (d, i) =>
      d.day === i + 1 && d.title && d.reading && d.output && d.passCriteria,
  ),
  "每日資料不完整或日次不連續。",
);
ok(q.length > 0, "題庫不得為空。");
ok(
  q.every((x) => examCodes.includes(x.exam)),
  "題目包含考綱未定義的考科。",
);
ok(uniq(q.map((x) => x.id)), "題目 ID 重複。");
for (const code of examCodes) {
  const examQuestions = q.filter((x) => x.exam === code);
  const numbers = examQuestions.map((x) => x.number).sort((a, b) => a - b);
  ok(examQuestions.length > 0, `${code} 題庫不得為空。`);
  ok(
    uniq(numbers) &&
      numbers.every(
        (number, index) => Number.isInteger(number) && number === index + 1,
      ),
    `${code} 題號必須從 １ 開始連續且不得重複。`,
  );
}
for (const x of q) {
  ok(nonEmptyString(x.id), "題目 ID 不得為空。");
  ok(questionTypes.has(x.type), `${x.id} 題型不支援。`);
  ok(nonEmptyString(x.question), `${x.id} 題幹不得為空。`);
  ok(nonEmptyString(x.difficulty), `${x.id} 難度不得為空。`);
  ok(
    Array.isArray(x.keywords) && x.keywords.every(nonEmptyString),
    `${x.id} 關鍵字必須是非空白字串陣列。`,
  );
  ok(
    Array.isArray(x.sourceIds) &&
      x.sourceIds.length > 0 &&
      uniq(x.sourceIds) &&
      x.sourceIds.every((id) => sourceIds.has(id)),
    `${x.id} 缺少來源、來源重複或來源 ID 不存在。`,
  );
  if (x.type === "true-false") {
    ok(typeof x.answer === "boolean", `${x.id} 是非題答案必須是布林值。`);
    ok(x.options === undefined, `${x.id} 是非題不得自訂選項。`);
  } else {
    ok(
      Array.isArray(x.options) && x.options.length >= 2,
      `${x.id} 選項至少需要 ２ 個。`,
    );
    if (Array.isArray(x.options)) {
      const optionIds = x.options.map((o) => o.id);
      ok(
        x.options.every(
          (option) =>
            nonEmptyString(option?.id) && nonEmptyString(option?.text),
        ),
        `${x.id} 選項 ID 與文字不得為空。`,
      );
      ok(uniq(optionIds), `${x.id} 選項 ID 重複。`);
      if (x.type === "multiple") {
        ok(
          Array.isArray(x.answer) &&
            x.answer.length >= 2 &&
            uniq(x.answer) &&
            x.answer.every((id) => optionIds.includes(id)),
          `${x.id} 複選答案至少需要 ２ 個、不重複且必須存在於選項。`,
        );
      } else {
        ok(
          typeof x.answer === "string" && optionIds.includes(x.answer),
          `${x.id} 單選答案不存在。`,
        );
      }
    }
  }
  ok(
    [x.explanation, x.trap, x.domain].every(nonEmptyString),
    `${x.id} 缺解析、陷阱或領域。`,
  );
}
ok(terms.length === 175, "名詞庫必須有 １７５ 個詞。");
ok(uniq(terms.map((x) => x.id)), "名詞 ID 重複。");
ok(s.length > 0 && uniq(s.map((x) => x.id)), "官方來源不得為空或 ID 重複。");
ok(
  s.every(
    (x) =>
      nonEmptyString(x.id) &&
      nonEmptyString(x.title) &&
      nonEmptyString(x.publisher) &&
      /^https:\/\/learn\.microsoft\.com\//.test(x.url),
  ),
  "官方來源欄位或網址不符。",
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
    sum.glossaryTerms === terms.length &&
    sum.officialSources === s.length,
  "內容摘要不一致。",
);
for (const f of ["start-here.md", "az-900.md", "sc-900.md", "cross-exam.md"])
  ok(statSync(join(root, "content/chapters", f)).size > 500, `${f} 過短。`);
if (bad) process.exit(1);
console.log(
  `[完成] 內容驗證通過：${days.length} 天、${q.length} 題（${examCodes.map((code) => `${code} ${q.filter((x) => x.exam === code).length} 題`).join("、")}）、${terms.length} 個名詞、${s.length} 項官方來源、${faq.length} 題 FAQ、${qa.length} 題 Q&A。`,
);
