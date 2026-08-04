import type { Question, QuestionAnswer, QuestionOption } from "./types.ts";

export const trueFalseOptions: QuestionOption[] = [
  { id: "true", text: "正確" },
  { id: "false", text: "錯誤" },
];

export function questionOptions(question: Question): QuestionOption[] {
  return question.type === "true-false" ? trueFalseOptions : question.options;
}

export function isAnswered(answer: QuestionAnswer | undefined): boolean {
  if (Array.isArray(answer)) return answer.length > 0;
  if (typeof answer === "string") return answer.length > 0;
  return typeof answer === "boolean";
}

export function isQuestionCorrect(
  question: Question,
  answer: QuestionAnswer | undefined,
): boolean {
  if (!isAnswered(answer)) return false;
  if (question.type === "multiple") {
    if (!Array.isArray(answer)) return false;
    const expected = new Set(question.answer);
    const actual = new Set(answer);
    return (
      actual.size === answer.length &&
      actual.size === expected.size &&
      [...actual].every((id) => expected.has(id))
    );
  }
  if (question.type === "true-false") {
    return typeof answer === "boolean" && answer === question.answer;
  }
  return typeof answer === "string" && answer === question.answer;
}

export function isOptionSelected(
  question: Question,
  answer: QuestionAnswer | undefined,
  optionId: string,
): boolean {
  if (question.type === "multiple") {
    return Array.isArray(answer) && answer.includes(optionId);
  }
  if (question.type === "true-false") {
    return typeof answer === "boolean" && String(answer) === optionId;
  }
  return answer === optionId;
}

export function isCorrectOption(question: Question, optionId: string): boolean {
  if (question.type === "multiple") return question.answer.includes(optionId);
  if (question.type === "true-false")
    return String(question.answer) === optionId;
  return question.answer === optionId;
}

export function answerText(
  question: Question,
  answer: QuestionAnswer | undefined,
): string {
  if (!isAnswered(answer)) return "未作答";
  const options = questionOptions(question);
  const ids = Array.isArray(answer)
    ? answer
    : question.type === "true-false"
      ? [String(answer)]
      : [String(answer)];
  return ids
    .map((id) => options.find((option) => option.id === id)?.text ?? id)
    .join("、");
}
