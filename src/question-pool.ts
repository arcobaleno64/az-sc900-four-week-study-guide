import type { ExamCode, ExamMeta, Question, QuestionStat } from "./types.ts";

export type ExamFilter = ExamCode | "混合";
export type PoolSource = "all" | "wrong" | "wrong-and-lucky";

export interface PoolOptions {
  questions: Question[];
  examMeta: ExamMeta[];
  exam: ExamFilter;
  /** 「全部」代表不指定領域，此時才會套用考綱權重配額。 */
  domain: string;
  count: number;
  source: PoolSource;
  stats: Record<string, QuestionStat>;
  wrongIds: string[];
  luckyIds: string[];
  /** 注入亂數以利測試；預設 Math.random。 */
  random?: () => number;
}

/** 一個抽題單位：獨立題目為長度 1，案例組為整組題目。 */
type Unit = Question[];

/** 「25%~30%」→ 27.5。取區間中值，官方權重一律以區間表示。 */
export function parseWeightMid(weight: string): number {
  const numbers = weight.match(/\d+(?:\.\d+)?/g)?.map(Number) ?? [];
  if (!numbers.length) return 0;
  return numbers.reduce((sum, value) => sum + value, 0) / numbers.length;
}

/**
 * 把考綱技能名稱轉成題庫的 domain 值：「描述 Microsoft Entra 的功能」→「Microsoft Entra」。
 * 兩邊若脫鉤，validate-content.mjs 會在建置時擋下來。
 */
export function domainOfSkill(skillName: string): string {
  return skillName
    .replace(/^描述/, "")
    .replace(/的功能$/, "")
    .trim();
}

/** 各領域依官方權重應抽的題數，以最大餘額法補足至剛好 total。 */
export function domainQuota(
  meta: ExamMeta,
  total: number,
): Record<string, number> {
  const entries = meta.skills.map((skill) => ({
    domain: domainOfSkill(skill.name),
    weight: parseWeightMid(skill.weight),
  }));
  const sum = entries.reduce((acc, entry) => acc + entry.weight, 0);
  if (!sum || !total) {
    return Object.fromEntries(entries.map((entry) => [entry.domain, 0]));
  }
  const raw = entries.map((entry) => ({
    domain: entry.domain,
    exact: (entry.weight / sum) * total,
  }));
  const quota: Record<string, number> = {};
  let assigned = 0;
  for (const item of raw) {
    quota[item.domain] = Math.floor(item.exact);
    assigned += quota[item.domain];
  }
  const remainders = raw
    .map((item) => ({ domain: item.domain, rest: item.exact % 1 }))
    .sort((a, b) => b.rest - a.rest);
  for (let i = 0; assigned < total && i < remainders.length; i++) {
    quota[remainders[i].domain] += 1;
    assigned += 1;
  }
  return quota;
}

/**
 * 單題權重。錯過的、猜對的與從沒碰過的優先出現；已經穩定答對的往後排。
 * 只影響出現機率，不會把任何題目從題庫中排除。
 */
export function questionWeight(
  question: Question,
  stats: Record<string, QuestionStat>,
  wrongIds: readonly string[],
  luckyIds: readonly string[],
): number {
  let weight = 1;
  if (wrongIds.includes(question.id)) weight *= 3;
  if (luckyIds.includes(question.id)) weight *= 2.5;
  const stat = stats[question.id];
  if (!stat || stat.attempts === 0) weight *= 2;
  else if (stat.correct / stat.attempts >= 0.8) weight *= 0.5;
  return weight;
}

function unitWeight(
  unit: Unit,
  stats: Record<string, QuestionStat>,
  wrongIds: readonly string[],
  luckyIds: readonly string[],
): number {
  const total = unit.reduce(
    (sum, question) =>
      sum + questionWeight(question, stats, wrongIds, luckyIds),
    0,
  );
  return total / unit.length;
}

/**
 * 把過濾後的題目組成抽題單位。同 caseId 且至少兩題存活者結成一組並依題號排序，
 * 其餘各自獨立。案例組的原子性是針對過濾後的池子而言。
 */
function buildUnits(pool: Question[]): Unit[] {
  const cases = new Map<string, Question[]>();
  const units: Unit[] = [];
  for (const question of pool) {
    if (question.caseId) {
      const group = cases.get(question.caseId) ?? [];
      group.push(question);
      cases.set(question.caseId, group);
    } else {
      units.push([question]);
    }
  }
  for (const group of cases.values()) {
    if (group.length >= 2) {
      units.push([...group].sort((a, b) => a.number - b.number));
    } else {
      units.push(...group.map((question) => [question]));
    }
  }
  return units;
}

/**
 * 依權重不放回抽樣一個單位，回傳其索引；池子為空時回傳 -1。
 * 權重全為 ０ 時退回均勻抽樣，不能固定挑第一個 —— 那會讓題序失去隨機性。
 */
export function drawIndex(weights: number[], random: () => number): number {
  if (!weights.length) return -1;
  const total = weights.reduce((sum, value) => sum + value, 0);
  if (total <= 0) return Math.floor(random() * weights.length);
  let ticket = random() * total;
  for (let i = 0; i < weights.length; i++) {
    ticket -= weights[i];
    if (ticket < 0) return i;
  }
  return weights.length - 1;
}

function shuffleWith<T>(input: T[], random: () => number): T[] {
  const result = [...input];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * 從候選單位中依權重抽題，直到累積題數達到 limit。
 * 同 conceptId 只取一次；塞不下的案例組整組跳過，絕不切半。
 */
function drawUnits(
  candidates: Unit[],
  limit: number,
  usedConcepts: Set<string>,
  options: PoolOptions,
  random: () => number,
): Unit[] {
  const remaining = [...candidates];
  const picked: Unit[] = [];
  let size = 0;
  while (size < limit && remaining.length) {
    const weights = remaining.map((unit) =>
      unitWeight(unit, options.stats, options.wrongIds, options.luckyIds),
    );
    const index = drawIndex(weights, random);
    if (index < 0) break;
    const [unit] = remaining.splice(index, 1);
    if (size + unit.length > limit) continue;
    if (unit.some((question) => usedConcepts.has(question.conceptId))) continue;
    for (const question of unit) usedConcepts.add(question.conceptId);
    picked.push(unit);
    size += unit.length;
  }
  return picked;
}

/** 依目前條件可用的題目數量，供 setup 畫面顯示與題數上限使用。 */
export function availableQuestions(
  options: Pick<
    PoolOptions,
    "questions" | "exam" | "domain" | "source" | "wrongIds" | "luckyIds"
  >,
): Question[] {
  const reviewIds = new Set(
    options.source === "wrong"
      ? options.wrongIds
      : options.source === "wrong-and-lucky"
        ? [...options.wrongIds, ...options.luckyIds]
        : [],
  );
  return options.questions.filter(
    (question) =>
      (options.exam === "混合" || question.exam === options.exam) &&
      (options.domain === "全部" || question.domain === options.domain) &&
      (options.source === "all" || reviewIds.has(question.id)),
  );
}

/**
 * 組出一輪練習的題目順序。
 * 未指定領域時依官方考綱權重分配各領域題數；同觀念變體一輪只出一題；
 * 案例組整組出現且相鄰。
 */
export function buildSession(options: PoolOptions): Question[] {
  const random = options.random ?? Math.random;
  const pool = availableQuestions(options);
  const limit = Math.min(options.count, pool.length);
  if (limit <= 0) return [];

  const usedConcepts = new Set<string>();
  const picked: Unit[] = [];
  const taken = new Set<Unit>();
  const units = buildUnits(pool);
  const take = (chosen: Unit[]) => {
    for (const unit of chosen) {
      picked.push(unit);
      taken.add(unit);
    }
  };

  if (options.domain === "全部") {
    const exams: ExamCode[] =
      options.exam === "混合" ? ["AZ-900", "SC-900"] : [options.exam];
    const perExam = Math.floor(limit / exams.length);
    exams.forEach((code, index) => {
      const meta = options.examMeta.find((item) => item.code === code);
      if (!meta) return;
      const share =
        index === exams.length - 1 ? limit - perExam * index : perExam;
      const quota = domainQuota(meta, share);
      for (const [domain, wanted] of Object.entries(quota)) {
        if (wanted <= 0) continue;
        const candidates = units.filter(
          (unit) =>
            !taken.has(unit) &&
            unit[0].exam === code &&
            unit[0].domain === domain,
        );
        take(drawUnits(candidates, wanted, usedConcepts, options, random));
      }
    });
  }

  // 配額抽不滿（該領域題目不足或觀念已用過）時，從剩下的題目補到指定題數。
  const size = () => picked.reduce((sum, unit) => sum + unit.length, 0);
  if (size() < limit) {
    const rest = units.filter((unit) => !taken.has(unit));
    take(drawUnits(rest, limit - size(), usedConcepts, options, random));
  }

  return shuffleWith(picked, random).flat();
}
