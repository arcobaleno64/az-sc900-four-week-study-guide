<script setup lang="ts">
import {
  isCompositeAnswer,
  isCorrectOption,
  isOptionSelected,
  matrixValue,
  segmentValue,
} from "../quiz";
import type {
  CompositeAnswer,
  Question,
  QuestionAnswer,
  QuestionOption,
} from "../types";

const props = defineProps<{
  question: Question;
  /** 已洗牌的選項；矩陣題與下拉題不使用。 */
  options: QuestionOption[];
  answer: QuestionAnswer | undefined;
  /** 練習模式作答後為 true，用來標出正解與誤選。 */
  revealed: boolean;
}>();
const emit = defineEmits<{ (event: "answer", value: QuestionAnswer): void }>();

function composite(): CompositeAnswer {
  return isCompositeAnswer(props.answer) ? { ...props.answer } : {};
}

function chooseOption(id: string) {
  if (props.revealed) return;
  const question = props.question;
  if (question.type === "multiple") {
    const current = Array.isArray(props.answer) ? props.answer : [];
    emit(
      "answer",
      current.includes(id)
        ? current.filter((optionId) => optionId !== id)
        : [...current, id],
    );
    return;
  }
  emit("answer", question.type === "true-false" ? id === "true" : id);
}

function chooseStatement(statementId: string, value: boolean) {
  if (props.revealed) return;
  emit("answer", { ...composite(), [statementId]: value });
}

function chooseSegment(segmentId: string, value: string) {
  if (props.revealed) return;
  emit("answer", { ...composite(), [segmentId]: value });
}

/** 把 template 拆成文字與空格，供逐段渲染。 */
const templateParts = () => {
  if (props.question.type !== "dropdown") return [];
  return props.question.template
    .split(/(\{[^}]+\})/)
    .filter((part) => part.length > 0)
    .map((part) =>
      part.startsWith("{") && part.endsWith("}")
        ? { kind: "slot" as const, id: part.slice(1, -1) }
        : { kind: "text" as const, text: part },
    );
};

const segmentOf = (id: string) =>
  props.question.type === "dropdown"
    ? props.question.segments.find((segment) => segment.id === id)
    : undefined;
</script>

<template>
  <p v-if="question.type === 'multiple'" class="muted">
    複選題：請選出所有正確答案。
  </p>
  <p v-else-if="question.type === 'true-false'" class="muted">
    是非題：判斷敘述是否正確。
  </p>
  <p v-else-if="question.type === 'yes-no-matrix'" class="muted">
    是非矩陣：每條陳述各自判斷，全部答對才算此題正確。
  </p>
  <p v-else-if="question.type === 'dropdown'" class="muted">
    完成句子：每個下拉都要選，全部答對才算此題正確。
  </p>

  <div
    v-if="question.type === 'yes-no-matrix'"
    class="matrix-list"
    role="group"
    aria-label="是非矩陣作答"
  >
    <div
      v-for="(statement, index) in question.statements"
      :key="statement.id"
      class="matrix-row"
      :data-state="
        revealed
          ? matrixValue(answer, statement.id) === statement.answer
            ? 'correct'
            : 'wrong'
          : undefined
      "
    >
      <span class="matrix-index">{{ index + 1 }}</span>
      <span class="matrix-text">{{ statement.text }}</span>
      <span class="matrix-choice">
        <button
          v-for="choice in [true, false]"
          type="button"
          :key="String(choice)"
          :class="{
            selected: matrixValue(answer, statement.id) === choice,
            correct: revealed && statement.answer === choice,
          }"
          :aria-pressed="matrixValue(answer, statement.id) === choice"
          :aria-label="`第 ${index + 1} 條：${choice ? '正確' : '錯誤'}`"
          :disabled="revealed"
          @click="chooseStatement(statement.id, choice)"
        >
          {{ choice ? "正確" : "錯誤" }}
        </button>
      </span>
    </div>
  </div>

  <div
    v-else-if="question.type === 'dropdown'"
    class="dropdown-sentence"
    role="group"
    aria-label="完成句子作答"
  >
    <template v-for="(part, index) in templateParts()" :key="index">
      <span v-if="part.kind === 'text'">{{ part.text }}</span>
      <label
        v-else
        class="dropdown-slot"
        :data-state="
          revealed
            ? segmentValue(answer, part.id) === segmentOf(part.id)?.answer
              ? 'correct'
              : 'wrong'
            : undefined
        "
      >
        <span class="dropdown-label">{{ segmentOf(part.id)?.label }}</span>
        <select
          :value="segmentValue(answer, part.id)"
          :disabled="revealed"
          @change="
            chooseSegment(part.id, ($event.target as HTMLSelectElement).value)
          "
        >
          <option value="">請選擇</option>
          <option
            v-for="option in segmentOf(part.id)?.options ?? []"
            :key="option.id"
            :value="option.id"
          >
            {{ option.text }}
          </option>
        </select>
      </label>
    </template>
  </div>

  <div
    v-else
    class="option-list"
    role="group"
    :aria-label="
      question.type === 'multiple'
        ? '複選答案'
        : question.type === 'true-false'
          ? '是非答案'
          : '單選答案'
    "
  >
    <button
      v-for="(option, index) in options"
      type="button"
      :key="option.id"
      :class="{
        selected: isOptionSelected(question, answer, option.id),
        correct: revealed && isCorrectOption(question, option.id),
        wrong:
          revealed &&
          isOptionSelected(question, answer, option.id) &&
          !isCorrectOption(question, option.id),
      }"
      :aria-pressed="isOptionSelected(question, answer, option.id)"
      @click="chooseOption(option.id)"
    >
      <span class="option-key">{{ index + 1 }}</span
      ><span>{{ option.text }}</span>
    </button>
  </div>
</template>
