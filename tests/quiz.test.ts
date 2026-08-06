import assert from "node:assert/strict";
import test from "node:test";
import {
  answerText,
  correctAnswerOf,
  isAnswered,
  isComplete,
  isQuestionCorrect,
  questionOptions,
} from "../src/quiz.ts";
import type {
  DropdownQuestion,
  MultipleQuestion,
  SingleQuestion,
  TrueFalseQuestion,
  YesNoMatrixQuestion,
} from "../src/types.ts";

const base = {
  id: "test-001",
  exam: "AZ-900" as const,
  number: 1,
  sourceIds: ["A1"],
  question: "測試題",
  explanation: "測試解析",
  trap: "測試陷阱",
  domain: "測試領域",
  difficulty: "情境" as const,
  keywords: ["關鍵字一", "關鍵字二"],
  conceptId: "test-concept",
};
const options = [
  { id: "A", text: "選項 A" },
  { id: "B", text: "選項 B" },
  { id: "C", text: "選項 C" },
];
const rationales = { A: "理由 A", B: "理由 B", C: "理由 C" };
const matrix: YesNoMatrixQuestion = {
  ...base,
  type: "yes-no-matrix",
  statements: [
    { id: "s1", text: "陳述一", answer: true, rationale: "理由一" },
    { id: "s2", text: "陳述二", answer: false, rationale: "理由二" },
    { id: "s3", text: "陳述三", answer: true, rationale: "理由三" },
  ],
};
const dropdown: DropdownQuestion = {
  ...base,
  type: "dropdown",
  template: "若要 {g1}，應使用 {g2}。",
  segments: [
    {
      id: "g1",
      label: "需求",
      options: [
        { id: "A", text: "需求 A" },
        { id: "B", text: "需求 B" },
        { id: "C", text: "需求 C" },
      ],
      answer: "B",
      rationale: "空格一理由",
    },
    {
      id: "g2",
      label: "服務",
      options: [
        { id: "A", text: "服務 A" },
        { id: "B", text: "服務 B" },
        { id: "C", text: "服務 C" },
      ],
      answer: "A",
      rationale: "空格二理由",
    },
  ],
};

test("single 僅接受完全相同的單一答案", () => {
  const question: SingleQuestion = {
    ...base,
    type: "single",
    options,
    answer: "B",
    optionRationales: rationales,
  };
  assert.equal(isQuestionCorrect(question, "B"), true);
  assert.equal(isQuestionCorrect(question, "A"), false);
  assert.equal(isQuestionCorrect(question, ["B"]), false);
});

test("multiple 忽略順序，但拒絕缺漏、多選與重複答案", () => {
  const question: MultipleQuestion = {
    ...base,
    type: "multiple",
    options,
    answer: ["A", "C"],
    optionRationales: rationales,
  };
  assert.equal(isQuestionCorrect(question, ["C", "A"]), true);
  assert.equal(isQuestionCorrect(question, ["A"]), false);
  assert.equal(isQuestionCorrect(question, ["A", "B", "C"]), false);
  assert.equal(isQuestionCorrect(question, ["A", "A", "C"]), false);
});

test("true-false 使用布林答案，false 仍視為已作答", () => {
  const question: TrueFalseQuestion = {
    ...base,
    type: "true-false",
    answer: false,
    optionRationales: { true: "理由真", false: "理由假" },
  };
  assert.equal(isAnswered(false), true);
  assert.equal(isQuestionCorrect(question, false), true);
  assert.equal(isQuestionCorrect(question, true), false);
  assert.equal(isQuestionCorrect(question, "false"), false);
});

test("下拉題選回「請選擇」留下的空字串不算作答", () => {
  // select 的預設項回傳空字串，若把它算成已作答，交卷提醒就不會提醒。
  assert.equal(isAnswered({ g1: "" }), false);
  assert.equal(isAnswered({ g1: "", g2: "" }), false);
  assert.equal(isAnswered({ g1: "", g2: "A" }), true);
  assert.equal(isAnswered({ s1: false }), true, "是非矩陣選「錯誤」是作答");
  assert.equal(isAnswered({}), false);
});

test("空答案不計為已作答", () => {
  assert.equal(isAnswered(undefined), false);
  assert.equal(isAnswered([]), false);
  assert.equal(isAnswered(""), false);
});

test("答案文字支援複選與是非題", () => {
  const multiple: MultipleQuestion = {
    ...base,
    type: "multiple",
    options,
    answer: ["A", "C"],
    optionRationales: rationales,
  };
  const trueFalse: TrueFalseQuestion = {
    ...base,
    type: "true-false",
    answer: true,
    optionRationales: { true: "理由真", false: "理由假" },
  };
  assert.equal(answerText(multiple, ["C", "A"]), "選項 C、選項 A");
  assert.equal(answerText(trueFalse, false), "錯誤");
  assert.deepEqual(
    questionOptions(trueFalse).map((option) => option.text),
    ["正確", "錯誤"],
  );
});

test("yes-no-matrix 全部陳述都答對才算正確", () => {
  const allRight = { s1: true, s2: false, s3: true };
  assert.equal(isQuestionCorrect(matrix, allRight), true);
  // 只有一條判斷相反就整題不給分，比照官方全對計分。
  assert.equal(
    isQuestionCorrect(matrix, { s1: true, s2: true, s3: true }),
    false,
  );
  assert.equal(
    isQuestionCorrect(matrix, { s1: false, s2: false, s3: true }),
    false,
  );
});

test("yes-no-matrix 漏答任何一條都不算作答完成，也不算答對", () => {
  const partial = { s1: true, s2: false };
  assert.equal(isAnswered(partial), true, "有填東西就算有作答");
  assert.equal(isComplete(matrix, partial), false);
  assert.equal(isQuestionCorrect(matrix, partial), false);
  assert.equal(isComplete(matrix, { s1: true, s2: false, s3: true }), true);
});

test("dropdown 每個空格都要對，漏填一格不算完成", () => {
  assert.equal(isQuestionCorrect(dropdown, { g1: "B", g2: "A" }), true);
  assert.equal(isQuestionCorrect(dropdown, { g1: "B", g2: "C" }), false);
  assert.equal(isComplete(dropdown, { g1: "B" }), false);
  assert.equal(isComplete(dropdown, { g1: "B", g2: "" }), false);
  assert.equal(isQuestionCorrect(dropdown, { g1: "B" }), false);
});

test("isComplete 對五種題型的判定", () => {
  const single: SingleQuestion = {
    ...base,
    type: "single",
    options,
    answer: "B",
    optionRationales: rationales,
  };
  const trueFalse: TrueFalseQuestion = {
    ...base,
    type: "true-false",
    answer: false,
    optionRationales: { true: "理由真", false: "理由假" },
  };
  const multiple: MultipleQuestion = {
    ...base,
    type: "multiple",
    options,
    answer: ["A", "C"],
    optionRationales: rationales,
  };
  assert.equal(isComplete(single, undefined), false);
  assert.equal(isComplete(single, "A"), true);
  assert.equal(isComplete(trueFalse, false), true);
  assert.equal(isComplete(multiple, []), false);
  assert.equal(isComplete(multiple, ["A"]), true);
  assert.equal(isComplete(matrix, {}), false);
  assert.equal(isComplete(dropdown, {}), false);
});

test("correctAnswerOf 與 answerText 覆蓋矩陣題與下拉題", () => {
  assert.deepEqual(correctAnswerOf(matrix), {
    s1: true,
    s2: false,
    s3: true,
  });
  assert.deepEqual(correctAnswerOf(dropdown), { g1: "B", g2: "A" });
  assert.equal(
    answerText(matrix, { s1: true, s2: false, s3: true }),
    "1. 正確／2. 錯誤／3. 正確",
  );
  assert.equal(
    answerText(dropdown, { g1: "B", g2: "A" }),
    "需求：需求 B／服務：服務 A",
  );
  assert.equal(answerText(matrix, undefined), "未作答");
  assert.equal(answerText(dropdown, undefined), "未作答");
});
