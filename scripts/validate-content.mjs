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
  cases = read("data/case-studies.json"),
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
  questionTypes = new Set([
    "single",
    "multiple",
    "true-false",
    "yes-no-matrix",
    "dropdown",
  ]),
  optionTypes = new Set(["single", "multiple", "true-false"]),
  difficulties = new Set(["基礎", "情境", "進階"]),
  caseIds = new Set(cases.map((x) => x.id)),
  // 與 src/question-pool.ts 的 domainOfSkill 相同轉換；兩邊脫鉤時下方的對照檢查會失敗。
  domainOfSkill = (name) =>
    name
      .replace(/^描述/, "")
      .replace(/的功能$/, "")
      .trim(),
  parseWeightMid = (weight) => {
    const numbers = (weight.match(/\d+(?:\.\d+)?/g) ?? []).map(Number);
    return numbers.length
      ? numbers.reduce((a, b) => a + b, 0) / numbers.length
      : 0;
  };
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
const conceptOwners = new Map();
for (const x of q) {
  ok(nonEmptyString(x.id), "題目 ID 不得為空。");
  ok(questionTypes.has(x.type), `${x.id} 題型不支援。`);
  ok(nonEmptyString(x.question), `${x.id} 題幹不得為空。`);
  ok(
    typeof x.question === "string" && x.question.trim().length >= 25,
    `${x.id} 題幹過短，情境題至少 ２５ 字。`,
  );
  ok(difficulties.has(x.difficulty), `${x.id} 難度必須是基礎／情境／進階。`);
  ok(
    Array.isArray(x.keywords) &&
      x.keywords.length >= 2 &&
      x.keywords.every(nonEmptyString) &&
      uniq(x.keywords),
    `${x.id} 關鍵字至少需要 ２ 個不重複的非空白字串。`,
  );
  ok(nonEmptyString(x.conceptId), `${x.id} 缺 conceptId。`);
  if (nonEmptyString(x.conceptId)) {
    const owner = conceptOwners.get(x.conceptId);
    if (owner) {
      ok(
        owner.exam === x.exam && owner.domain === x.domain,
        `${x.id} 與 ${owner.id} 共用 conceptId「${x.conceptId}」但考科或領域不同。`,
      );
    } else {
      conceptOwners.set(x.conceptId, {
        id: x.id,
        exam: x.exam,
        domain: x.domain,
      });
    }
  }
  ok(
    x.caseId === undefined || caseIds.has(x.caseId),
    `${x.id} 的 caseId「${x.caseId}」不存在於 case-studies.json。`,
  );
  ok(
    Array.isArray(x.sourceIds) &&
      x.sourceIds.length > 0 &&
      uniq(x.sourceIds) &&
      x.sourceIds.every((id) => sourceIds.has(id)),
    `${x.id} 缺少來源、來源重複或來源 ID 不存在。`,
  );

  if (optionTypes.has(x.type)) {
    let optionIds = ["true", "false"];
    if (x.type === "true-false") {
      ok(typeof x.answer === "boolean", `${x.id} 是非題答案必須是布林值。`);
      ok(x.options === undefined, `${x.id} 是非題不得自訂選項。`);
    } else {
      ok(
        Array.isArray(x.options) && x.options.length >= 2,
        `${x.id} 選項至少需要 ２ 個。`,
      );
      if (!Array.isArray(x.options)) continue;
      optionIds = x.options.map((o) => o.id);
      ok(
        x.options.every(
          (option) =>
            nonEmptyString(option?.id) && nonEmptyString(option?.text),
        ),
        `${x.id} 選項 ID 與文字不得為空。`,
      );
      ok(uniq(optionIds), `${x.id} 選項 ID 重複。`);
      ok(
        uniq(x.options.map((o) => String(o.text).trim())),
        `${x.id} 選項文字重複。`,
      );
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
    // 逐選項理由是本題庫反盲猜的核心：干擾選項也必須說明為何不選。
    const rationales = x.optionRationales;
    ok(
      rationales &&
        typeof rationales === "object" &&
        !Array.isArray(rationales),
      `${x.id} 缺 optionRationales。`,
    );
    if (rationales && typeof rationales === "object") {
      const keys = Object.keys(rationales);
      ok(
        optionIds.every((id) => nonEmptyString(rationales[id])),
        `${x.id} 的 optionRationales 未涵蓋每一個選項。`,
      );
      ok(
        keys.every((key) => optionIds.includes(key)),
        `${x.id} 的 optionRationales 含不存在的選項鍵。`,
      );
    }
  } else if (x.type === "yes-no-matrix") {
    ok(
      x.optionRationales === undefined,
      `${x.id} 矩陣題不得有 optionRationales。`,
    );
    ok(x.answer === undefined, `${x.id} 矩陣題不得有頂層 answer。`);
    ok(
      Array.isArray(x.statements) &&
        x.statements.length >= 3 &&
        x.statements.length <= 5,
      `${x.id} 矩陣題需要 ３ 到 ５ 條陳述。`,
    );
    if (Array.isArray(x.statements)) {
      ok(uniq(x.statements.map((st) => st?.id)), `${x.id} 陳述 ID 重複。`);
      ok(
        x.statements.every(
          (st) =>
            nonEmptyString(st?.id) &&
            nonEmptyString(st?.text) &&
            nonEmptyString(st?.rationale) &&
            typeof st?.answer === "boolean",
        ),
        `${x.id} 每條陳述都需要 id、text、rationale 與布林 answer。`,
      );
      ok(
        new Set(x.statements.map((st) => st?.answer)).size > 1,
        `${x.id} 矩陣題的陳述答案不得全部相同。`,
      );
    }
  } else if (x.type === "dropdown") {
    ok(
      x.optionRationales === undefined,
      `${x.id} 下拉題不得有 optionRationales。`,
    );
    ok(x.answer === undefined, `${x.id} 下拉題不得有頂層 answer。`);
    ok(nonEmptyString(x.template), `${x.id} 下拉題缺 template。`);
    ok(
      Array.isArray(x.segments) && x.segments.length >= 2,
      `${x.id} 下拉題至少需要 ２ 個空格。`,
    );
    if (Array.isArray(x.segments) && nonEmptyString(x.template)) {
      const segmentIds = x.segments.map((seg) => seg?.id);
      ok(uniq(segmentIds), `${x.id} 空格 ID 重複。`);
      ok(
        x.segments.every(
          (seg) =>
            nonEmptyString(seg?.id) &&
            nonEmptyString(seg?.label) &&
            nonEmptyString(seg?.rationale) &&
            Array.isArray(seg?.options) &&
            seg.options.length >= 3 &&
            uniq(seg.options.map((o) => o?.id)) &&
            seg.options.every(
              (o) => nonEmptyString(o?.id) && nonEmptyString(o?.text),
            ) &&
            seg.options.some((o) => o?.id === seg.answer),
        ),
        `${x.id} 每個空格需要 id、label、rationale、至少 ３ 個選項且答案存在於選項。`,
      );
      const placeholders = (x.template.match(/\{([^}]+)\}/g) ?? []).map((m) =>
        m.slice(1, -1),
      );
      ok(
        placeholders.length === segmentIds.length &&
          placeholders.every((name) => segmentIds.includes(name)) &&
          uniq(placeholders),
        `${x.id} 的 template 佔位符與 segments 的 ID 未一一對應。`,
      );
    }
  }

  ok(
    [x.explanation, x.trap, x.domain].every(nonEmptyString),
    `${x.id} 缺解析、陷阱或領域。`,
  );
}

for (const item of cases) {
  ok(
    [item.id, item.title, item.scenario].every(nonEmptyString) &&
      examCodes.includes(item.exam),
    `案例 ${item.id} 欄位不完整或考科不存在。`,
  );
  ok(
    Array.isArray(item.requirements) &&
      item.requirements.length > 0 &&
      item.requirements.every(nonEmptyString),
    `案例 ${item.id} 缺需求敘述。`,
  );
  ok(
    Array.isArray(item.sourceIds) &&
      item.sourceIds.length > 0 &&
      item.sourceIds.every((id) => sourceIds.has(id)),
    `案例 ${item.id} 的來源不存在。`,
  );
  const members = q.filter((x) => x.caseId === item.id);
  ok(members.length >= 3, `案例 ${item.id} 至少需要 ３ 題。`);
  ok(
    members.every((x) => x.exam === item.exam),
    `案例 ${item.id} 的題目考科與案例不一致。`,
  );
  // 抽題時以案例組第一題的領域代表整組配額，跨領域案例會讓權重配額失準。
  ok(
    new Set(members.map((x) => x.domain)).size <= 1,
    `案例 ${item.id} 的題目橫跨多個技能領域，加權抽題無法正確歸屬配額。`,
  );
}
ok(uniq(cases.map((x) => x.id)), "案例 ID 重複。");

// 考綱技能名稱必須能對應到題庫實際使用的 domain，否則加權抽題會靜默失準。
const usedDomains = new Set(q.map((x) => x.domain));
for (const exam of m.exams) {
  for (const skill of exam.skills) {
    ok(
      usedDomains.has(domainOfSkill(skill.name)),
      `考綱技能「${skill.name}」對應不到任何題目領域「${domainOfSkill(skill.name)}」。`,
    );
  }
}

// 題庫達到目標規模後，各領域佔比必須落在官方權重區間 ±５ 個百分點。
// 未達 １００ 題的過渡期不套用，避免分批擴充時卡住建置。
for (const exam of m.exams) {
  const examQuestions = q.filter((x) => x.exam === exam.code);
  if (examQuestions.length < 100) continue;
  for (const skill of exam.skills) {
    const domain = domainOfSkill(skill.name);
    const actual =
      (examQuestions.filter((x) => x.domain === domain).length /
        examQuestions.length) *
      100;
    const target = parseWeightMid(skill.weight);
    ok(
      Math.abs(actual - target) <= 5,
      `${exam.code}「${domain}」佔 ${actual.toFixed(1)}%，偏離官方權重中值 ${target}% 超過 ５ 個百分點。`,
    );
  }
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
