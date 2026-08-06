import assert from "node:assert/strict";
import test from "node:test";
import {
  applyAnswer,
  defaults,
  sanitizeProgress,
} from "../src/progress-rules.ts";
import type { Confidence, ProgressData } from "../src/types.ts";

const fresh = (): ProgressData => structuredClone(defaults);
const NOW = "2026-08-06T00:00:00.000Z";
const answer = (
  data: ProgressData,
  id: string,
  correct: boolean,
  confidence?: Confidence,
) => applyAnswer(data, id, correct, confidence, NOW);

test("答對但自評不確定的題會進入幸運答對池", () => {
  const data = fresh();
  answer(data, "q1", true, "unsure");
  assert.deepEqual(data.luckyQuestionIds, ["q1"]);
  assert.deepEqual(data.wrongQuestionIds, []);
  assert.equal(data.confidenceLog.q1, "unsure");
});

test("再次答對且自評有把握，才會離開幸運答對池", () => {
  const data = fresh();
  answer(data, "q1", true, "unsure");
  answer(data, "q1", true, "sure");
  assert.deepEqual(data.luckyQuestionIds, []);
  assert.equal(data.questionStats.q1.attempts, 2);
  assert.equal(data.questionStats.q1.correct, 2);
});

test("關閉自評時答對，不足以推翻先前的幸運答對紀錄", () => {
  const data = fresh();
  answer(data, "q1", true, "unsure");
  answer(data, "q1", true, undefined);
  assert.deepEqual(
    data.luckyQuestionIds,
    ["q1"],
    "沒有把握度資訊的一次作答就宣告學會，等於把缺口靜靜抹掉",
  );
  assert.deepEqual(data.wrongQuestionIds, []);
});

test("幸運答對的題之後答錯，只留在錯題池不會同時掛在兩邊", () => {
  const data = fresh();
  answer(data, "q1", true, "unsure");
  answer(data, "q1", false, "sure");
  assert.deepEqual(data.wrongQuestionIds, ["q1"]);
  assert.deepEqual(data.luckyQuestionIds, []);
});

test("答錯再答對會離開錯題池，統計累加正確", () => {
  const data = fresh();
  answer(data, "q1", false, "unsure");
  assert.deepEqual(data.wrongQuestionIds, ["q1"]);
  answer(data, "q1", true, "sure");
  assert.deepEqual(data.wrongQuestionIds, []);
  assert.deepEqual(data.questionStats.q1, {
    attempts: 2,
    correct: 1,
    wrong: 1,
    lastAnsweredAt: NOW,
  });
});

test("重複答錯不會在錯題池留下重複項目", () => {
  const data = fresh();
  answer(data, "q1", false);
  answer(data, "q1", false);
  assert.deepEqual(data.wrongQuestionIds, ["q1"]);
  assert.equal(data.questionStats.q1.wrong, 2);
});

test("清洗會補上舊版進度檔沒有的欄位", () => {
  const legacy = {
    schema: "az-sc900-study-progress",
    version: 1,
    completedDays: [2, 1, 1],
    dayNotes: { "1": "筆記", "99": "超出範圍" },
    wrongQuestionIds: ["q2"],
    theme: "dark",
  };
  const data = sanitizeProgress(legacy);
  assert.deepEqual(data.completedDays, [1, 2]);
  assert.deepEqual(data.dayNotes, { "1": "筆記" });
  assert.deepEqual(data.wrongQuestionIds, ["q2"]);
  assert.deepEqual(data.luckyQuestionIds, []);
  assert.deepEqual(data.confidenceLog, {});
  assert.equal(data.theme, "dark");
});

test("清洗會丟掉不合法的信心度與幸運答對項目", () => {
  const data = sanitizeProgress({
    confidenceLog: { q1: "sure", q2: "maybe", q3: 5 },
    luckyQuestionIds: ["q1", "q1", 7, null],
  });
  assert.deepEqual(data.confidenceLog, { q1: "sure" });
  assert.deepEqual(data.luckyQuestionIds, ["q1"]);
});

test("清洗非物件輸入時退回預設值", () => {
  assert.deepEqual(sanitizeProgress(null), defaults);
  assert.deepEqual(sanitizeProgress("字串"), defaults);
});
