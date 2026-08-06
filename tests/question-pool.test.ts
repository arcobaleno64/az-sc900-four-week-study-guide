import assert from "node:assert/strict";
import test from "node:test";
import {
  availableQuestions,
  buildSession,
  domainOfSkill,
  domainQuota,
  drawIndex,
  parseWeightMid,
  questionWeight,
} from "../src/question-pool.ts";
import type { ExamMeta, Question, SingleQuestion } from "../src/types.ts";

/** 固定亂數，讓抽題結果可重現。 */
function seeded(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

const meta: ExamMeta[] = [
  {
    code: "AZ-900",
    name: "Microsoft Azure Fundamentals",
    effectiveDate: "2026-07-20",
    durationMinutes: 45,
    passingScore: 700,
    skills: [
      { name: "描述雲端概念", weight: "25%~30%" },
      { name: "描述 Azure 架構與服務", weight: "35%~40%" },
      { name: "描述 Azure 管理與治理", weight: "30%~35%" },
    ],
    studyGuide: "https://learn.microsoft.com/",
    certificationPage: "https://learn.microsoft.com/",
  },
];

let serial = 0;
function makeQuestion(
  domain: string,
  overrides: Partial<SingleQuestion> = {},
): Question {
  serial += 1;
  return {
    id: overrides.id ?? `q-${serial}`,
    exam: "AZ-900",
    number: serial,
    type: "single",
    sourceIds: ["A1"],
    question: `第 ${serial} 題的情境敘述，長度足以通過驗證器的下限檢查。`,
    options: [
      { id: "A", text: "選項 A" },
      { id: "B", text: "選項 B" },
    ],
    answer: "A",
    optionRationales: { A: "正解理由", B: "非解理由" },
    explanation: "解析",
    trap: "陷阱",
    domain,
    difficulty: "情境",
    keywords: ["關鍵字一", "關鍵字二"],
    conceptId: overrides.conceptId ?? `concept-${serial}`,
    ...overrides,
  } as Question;
}

const domains = ["雲端概念", "Azure 架構與服務", "Azure 管理與治理"];

function bigPool(perDomain = 40): Question[] {
  return domains.flatMap((domain) =>
    Array.from({ length: perDomain }, () => makeQuestion(domain)),
  );
}

const emptyState = { stats: {}, wrongIds: [], luckyIds: [] };

test("parseWeightMid 取區間中值", () => {
  assert.equal(parseWeightMid("25%~30%"), 27.5);
  assert.equal(parseWeightMid("35%~40%"), 37.5);
  assert.equal(parseWeightMid("無數字"), 0);
});

test("domainOfSkill 把考綱技能名稱轉成題庫領域", () => {
  assert.equal(domainOfSkill("描述雲端概念"), "雲端概念");
  assert.equal(domainOfSkill("描述 Azure 架構與服務"), "Azure 架構與服務");
  assert.equal(domainOfSkill("描述 Microsoft Entra 的功能"), "Microsoft Entra");
});

test("domainQuota 分配後總和必須剛好等於題數", () => {
  for (const total of [10, 25, 40, 100]) {
    const quota = domainQuota(meta[0], total);
    const sum = Object.values(quota).reduce((a, b) => a + b, 0);
    assert.equal(sum, total, `total=${total} 時配額總和不符`);
  }
});

test("domainQuota 的各領域數量符合官方權重比例", () => {
  // 權重中值 27.5／37.5／32.5，總和 97.5。
  assert.deepEqual(domainQuota(meta[0], 100), {
    雲端概念: 28,
    "Azure 架構與服務": 39,
    "Azure 管理與治理": 33,
  });
  assert.deepEqual(domainQuota(meta[0], 40), {
    雲端概念: 11,
    "Azure 架構與服務": 16,
    "Azure 管理與治理": 13,
  });
  // 每個領域都不該被四捨五入成 0，否則小題數的一輪會整個領域缺席。
  for (const value of Object.values(domainQuota(meta[0], 10)))
    assert.ok(value >= 1);
});

test("混合模式兩科各半，且各科內仍依權重配題", () => {
  const scMeta: ExamMeta = {
    ...meta[0],
    code: "SC-900",
    skills: [{ name: "描述 Microsoft Entra 的功能", weight: "100%" }],
  };
  const pool = [
    ...bigPool(20),
    ...Array.from({ length: 60 }, () =>
      makeQuestion("Microsoft Entra", { exam: "SC-900" } as never),
    ),
  ];
  const session = buildSession({
    questions: pool,
    examMeta: [meta[0], scMeta],
    exam: "混合",
    domain: "全部",
    count: 40,
    source: "all",
    ...emptyState,
    random: seeded(5),
  });
  assert.equal(session.length, 40);
  const az = session.filter((q) => q.exam === "AZ-900").length;
  assert.equal(az, 20, `AZ-900 抽到 ${az} 題，混合模式應各半`);
  assert.equal(session.filter((q) => q.exam === "SC-900").length, 20);
});

test("候選不足時補到指定題數，但絕不重複同一題", () => {
  // 「Azure 管理與治理」只有 2 題，配額 13 題填不滿，缺口由其他領域補上。
  const pool = [
    ...Array.from({ length: 30 }, () => makeQuestion("雲端概念")),
    ...Array.from({ length: 30 }, () => makeQuestion("Azure 架構與服務")),
    ...Array.from({ length: 2 }, () => makeQuestion("Azure 管理與治理")),
  ];
  const session = buildSession({
    questions: pool,
    examMeta: meta,
    exam: "AZ-900",
    domain: "全部",
    count: 40,
    source: "all",
    ...emptyState,
    random: seeded(9),
  });
  assert.equal(session.length, 40, "補題路徑必須把題數補滿");
  assert.equal(
    new Set(session.map((q) => q.id)).size,
    40,
    "補題不得把同一題抽第二次",
  );
  assert.equal(
    session.filter((q) => q.domain === "Azure 管理與治理").length,
    2,
    "供給不足的領域只能出它有的題數",
  );
});

test("題數超過可用題目時回傳全部可用題目，不會無限迴圈", () => {
  const pool = Array.from({ length: 5 }, () => makeQuestion("雲端概念"));
  const session = buildSession({
    questions: pool,
    examMeta: meta,
    exam: "AZ-900",
    domain: "全部",
    count: 999,
    source: "all",
    ...emptyState,
    random: seeded(2),
  });
  assert.equal(session.length, 5);
});

test("drawIndex 依權重抽樣，零權重時退回均勻抽樣", () => {
  // 權重比例：ticket 落在各段的位置決定索引。
  assert.equal(
    drawIndex([1, 1, 2], () => 0),
    0,
  );
  assert.equal(
    drawIndex([1, 1, 2], () => 0.3),
    1,
  );
  assert.equal(
    drawIndex([1, 1, 2], () => 0.9),
    2,
  );
  assert.equal(
    drawIndex([], () => 0.5),
    -1,
  );
  // 全零時不得固定回 0，否則整輪題序退化成永遠挑第一個。
  const picked = new Set<number>();
  for (const r of [0.05, 0.25, 0.45, 0.65, 0.85])
    picked.add(drawIndex([0, 0, 0, 0, 0], () => r));
  assert.deepEqual([...picked].sort(), [0, 1, 2, 3, 4]);
});

test("未指定領域時，各領域題數依官方權重分配", () => {
  const session = buildSession({
    questions: bigPool(),
    examMeta: meta,
    exam: "AZ-900",
    domain: "全部",
    count: 40,
    source: "all",
    ...emptyState,
    random: seeded(7),
  });
  assert.equal(session.length, 40);
  const actual: Record<string, number> = {};
  for (const q of session) actual[q.domain] = (actual[q.domain] ?? 0) + 1;
  const quota = domainQuota(meta[0], 40);
  for (const domain of domains) {
    assert.equal(
      actual[domain],
      quota[domain],
      `${domain} 抽到 ${actual[domain]} 題，配額是 ${quota[domain]}`,
    );
  }
});

test("同一個 conceptId 的變體題，一輪只會出現一題", () => {
  const variants = Array.from({ length: 5 }, () =>
    makeQuestion("雲端概念", { conceptId: "shared-concept" }),
  );
  const others = Array.from({ length: 5 }, () => makeQuestion("雲端概念"));
  const session = buildSession({
    questions: [...variants, ...others],
    examMeta: meta,
    exam: "AZ-900",
    domain: "雲端概念",
    count: 10,
    source: "all",
    ...emptyState,
    random: seeded(3),
  });
  const shared = session.filter((q) => q.conceptId === "shared-concept");
  assert.equal(shared.length, 1);
  // 觀念去重會縮短本輪題數，不會用其他題目硬補到 10 題後又重複觀念。
  assert.equal(new Set(session.map((q) => q.conceptId)).size, session.length);
});

test("案例組整組出現且在題序中相鄰", () => {
  const caseQuestions = [3, 1, 2].map((n) =>
    makeQuestion("Azure 架構與服務", {
      id: `case-q-${n}`,
      number: n,
      caseId: "case-1",
    }),
  );
  const pool = [
    ...caseQuestions,
    ...Array.from({ length: 12 }, () => makeQuestion("Azure 架構與服務")),
  ];
  for (let seed = 1; seed <= 20; seed++) {
    const session = buildSession({
      questions: pool,
      examMeta: meta,
      exam: "AZ-900",
      domain: "Azure 架構與服務",
      count: 8,
      source: "all",
      ...emptyState,
      random: seeded(seed),
    });
    const positions = session
      .map((q, index) => (q.caseId === "case-1" ? index : -1))
      .filter((index) => index >= 0);
    if (positions.length === 0) continue;
    assert.equal(positions.length, 3, `seed=${seed} 案例組被切半`);
    assert.equal(positions[2] - positions[0], 2, `seed=${seed} 案例組不相鄰`);
    assert.deepEqual(
      positions.map((index) => session[index].number),
      [1, 2, 3],
      `seed=${seed} 案例組內部未依題號排序`,
    );
  }
});

test("案例組塞不下剩餘題數時整組略過，不會只出一半", () => {
  const caseQuestions = [1, 2, 3].map((n) =>
    makeQuestion("雲端概念", { id: `c-${n}`, number: n, caseId: "case-2" }),
  );
  for (let seed = 1; seed <= 20; seed++) {
    const session = buildSession({
      questions: [
        ...caseQuestions,
        ...Array.from({ length: 6 }, () => makeQuestion("雲端概念")),
      ],
      examMeta: meta,
      exam: "AZ-900",
      domain: "雲端概念",
      count: 2,
      source: "all",
      ...emptyState,
      random: seeded(seed),
    });
    assert.equal(session.filter((q) => q.caseId === "case-2").length, 0);
    assert.equal(session.length, 2);
  }
});

test("錯題與幸運答對的權重高於已穩定答對的題目", () => {
  const plain = makeQuestion("雲端概念", { id: "plain" });
  const wrong = makeQuestion("雲端概念", { id: "wrong" });
  const lucky = makeQuestion("雲端概念", { id: "lucky" });
  const mastered = makeQuestion("雲端概念", { id: "mastered" });
  const stats = {
    plain: { attempts: 2, correct: 1, wrong: 1, lastAnsweredAt: "" },
    wrong: { attempts: 2, correct: 1, wrong: 1, lastAnsweredAt: "" },
    lucky: { attempts: 2, correct: 2, wrong: 0, lastAnsweredAt: "" },
    mastered: { attempts: 5, correct: 5, wrong: 0, lastAnsweredAt: "" },
  };
  assert.ok(
    questionWeight(wrong, stats, ["wrong"], []) >
      questionWeight(plain, stats, [], []),
  );
  assert.ok(
    questionWeight(lucky, stats, [], ["lucky"]) >
      questionWeight(mastered, stats, [], []),
  );

  // 大量抽樣下，錯題的出現率必須明顯高於已穩定答對的題目。
  const random = seeded(11);
  const counts: Record<string, number> = {};
  for (let round = 0; round < 400; round++) {
    const session = buildSession({
      questions: [plain, wrong, lucky, mastered],
      examMeta: meta,
      exam: "AZ-900",
      domain: "雲端概念",
      count: 1,
      source: "all",
      stats,
      wrongIds: ["wrong"],
      luckyIds: ["lucky"],
      random,
    });
    for (const q of session) counts[q.id] = (counts[q.id] ?? 0) + 1;
  }
  assert.ok(
    counts.wrong > counts.mastered * 2,
    `錯題 ${counts.wrong} 次、已精熟 ${counts.mastered} 次，加權未生效`,
  );
});

test("題目來源篩選只影響候選池，不影響其他條件", () => {
  const a = makeQuestion("雲端概念", { id: "a" });
  const b = makeQuestion("雲端概念", { id: "b" });
  const c = makeQuestion("雲端概念", { id: "c" });
  const base = {
    questions: [a, b, c],
    exam: "AZ-900" as const,
    domain: "全部",
    wrongIds: ["a"],
    luckyIds: ["b"],
  };
  assert.deepEqual(
    availableQuestions({ ...base, source: "all" }).map((q) => q.id),
    ["a", "b", "c"],
  );
  assert.deepEqual(
    availableQuestions({ ...base, source: "wrong" }).map((q) => q.id),
    ["a"],
  );
  assert.deepEqual(
    availableQuestions({ ...base, source: "wrong-and-lucky" }).map((q) => q.id),
    ["a", "b"],
  );
});
