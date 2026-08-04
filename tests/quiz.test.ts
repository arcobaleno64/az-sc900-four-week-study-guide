import assert from "node:assert/strict";
import test from "node:test";
import {
  answerText,
  isAnswered,
  isQuestionCorrect,
  questionOptions,
} from "../src/quiz.ts";
import type {
  MultipleQuestion,
  SingleQuestion,
  TrueFalseQuestion,
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
  difficulty: "測試",
  keywords: [],
};
const options = [
  { id: "A", text: "選項 A" },
  { id: "B", text: "選項 B" },
  { id: "C", text: "選項 C" },
];

test("single 僅接受完全相同的單一答案", () => {
  const question: SingleQuestion = {
    ...base,
    type: "single",
    options,
    answer: "B",
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
  };
  assert.equal(isAnswered(false), true);
  assert.equal(isQuestionCorrect(question, false), true);
  assert.equal(isQuestionCorrect(question, true), false);
  assert.equal(isQuestionCorrect(question, "false"), false);
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
  };
  const trueFalse: TrueFalseQuestion = {
    ...base,
    type: "true-false",
    answer: true,
  };
  assert.equal(answerText(multiple, ["C", "A"]), "選項 C、選項 A");
  assert.equal(answerText(trueFalse, false), "錯誤");
  assert.deepEqual(
    questionOptions(trueFalse).map((option) => option.text),
    ["正確", "錯誤"],
  );
});
