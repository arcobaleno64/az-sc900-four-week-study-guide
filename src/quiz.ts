import type {
  CompositeAnswer,
  Question,
  QuestionAnswer,
  QuestionOption,
} from "./types.ts";

export const trueFalseOptions: QuestionOption[] = [
  { id: "true", text: "正確" },
  { id: "false", text: "錯誤" },
];

/** 有固定選項清單的題型才回傳選項；矩陣題與下拉題的選項掛在各子項上。 */
export function questionOptions(question: Question): QuestionOption[] {
  if (question.type === "true-false") return trueFalseOptions;
  if (question.type === "single" || question.type === "multiple")
    return question.options;
  return [];
}

export function isCompositeAnswer(
  answer: QuestionAnswer | undefined,
): answer is CompositeAnswer {
  return (
    typeof answer === "object" && answer !== null && !Array.isArray(answer)
  );
}

/**
 * 是否有填過任何一格。子項題型只要有一格有效值就算數 —— 下拉題選回「請選擇」
 * 會留下空字串，那不算作答。要判斷是否**填完**請一律用 `isComplete`。
 */
export function isAnswered(answer: QuestionAnswer | undefined): boolean {
  if (Array.isArray(answer)) return answer.length > 0;
  if (isCompositeAnswer(answer))
    return Object.values(answer).some(
      (value) => value === true || value === false || value !== "",
    );
  if (typeof answer === "string") return answer.length > 0;
  return typeof answer === "boolean";
}

/** 子項題型必須每一格都填了才算作答完成；作答計數與交卷提醒都用這個。 */
export function isComplete(
  question: Question,
  answer: QuestionAnswer | undefined,
): boolean {
  if (question.type === "yes-no-matrix") {
    if (!isCompositeAnswer(answer)) return false;
    return question.statements.every(
      (statement) => typeof answer[statement.id] === "boolean",
    );
  }
  if (question.type === "dropdown") {
    if (!isCompositeAnswer(answer)) return false;
    return question.segments.every(
      (segment) => typeof answer[segment.id] === "string" && answer[segment.id],
    );
  }
  return isAnswered(answer);
}

export function isQuestionCorrect(
  question: Question,
  answer: QuestionAnswer | undefined,
): boolean {
  if (!isComplete(question, answer)) return false;
  if (question.type === "yes-no-matrix") {
    const given = answer as CompositeAnswer;
    return question.statements.every(
      (statement) => given[statement.id] === statement.answer,
    );
  }
  if (question.type === "dropdown") {
    const given = answer as CompositeAnswer;
    return question.segments.every(
      (segment) => given[segment.id] === segment.answer,
    );
  }
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
  if (question.type === "single") return question.answer === optionId;
  return false;
}

/** 讀取單一選項的對錯理由；矩陣題與下拉題的理由由呼叫端直接讀子項。 */
export function optionRationale(question: Question, optionId: string): string {
  if (
    question.type === "single" ||
    question.type === "multiple" ||
    question.type === "true-false"
  ) {
    return question.optionRationales[optionId] ?? "";
  }
  return "";
}

/** 矩陣題某條陳述目前的作答，未作答回 undefined。 */
export function matrixValue(
  answer: QuestionAnswer | undefined,
  statementId: string,
): boolean | undefined {
  if (!isCompositeAnswer(answer)) return undefined;
  const value = answer[statementId];
  return typeof value === "boolean" ? value : undefined;
}

/** 下拉題某個空格目前選到的選項 ID，未作答回空字串。 */
export function segmentValue(
  answer: QuestionAnswer | undefined,
  segmentId: string,
): string {
  if (!isCompositeAnswer(answer)) return "";
  const value = answer[segmentId];
  return typeof value === "string" ? value : "";
}

export function answerText(
  question: Question,
  answer: QuestionAnswer | undefined,
): string {
  if (question.type === "yes-no-matrix") {
    if (!isAnswered(answer)) return "未作答";
    return question.statements
      .map((statement, index) => {
        const value = matrixValue(answer, statement.id);
        return `${index + 1}. ${value === undefined ? "未作答" : value ? "正確" : "錯誤"}`;
      })
      .join("／");
  }
  if (question.type === "dropdown") {
    if (!isAnswered(answer)) return "未作答";
    return question.segments
      .map((segment) => {
        const value = segmentValue(answer, segment.id);
        const text = segment.options.find(
          (option) => option.id === value,
        )?.text;
        return `${segment.label}：${text ?? "未作答"}`;
      })
      .join("／");
  }
  if (!isAnswered(answer)) return "未作答";
  const options = questionOptions(question);
  const ids = Array.isArray(answer) ? answer : [String(answer)];
  return ids
    .map((id) => options.find((option) => option.id === id)?.text ?? id)
    .join("、");
}

/** 把題目的標準答案轉成 QuestionAnswer，供結果頁顯示正確答案。 */
export function correctAnswerOf(question: Question): QuestionAnswer {
  if (question.type === "yes-no-matrix") {
    return Object.fromEntries(
      question.statements.map((statement) => [statement.id, statement.answer]),
    );
  }
  if (question.type === "dropdown") {
    return Object.fromEntries(
      question.segments.map((segment) => [segment.id, segment.answer]),
    );
  }
  return question.answer;
}
