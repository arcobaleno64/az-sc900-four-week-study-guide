<script setup lang="ts">
import { computed } from "vue";
import { sources } from "../content";
import {
  answerText,
  correctAnswerOf,
  isCorrectOption,
  isOptionSelected,
  matrixValue,
  optionRationale,
  questionOptions,
  segmentValue,
} from "../quiz";
import type { Question, QuestionAnswer } from "../types";

const props = defineProps<{
  question: Question;
  answer: QuestionAnswer | undefined;
}>();

const questionSources = computed(() => {
  const ids = new Set(props.question.sourceIds);
  return sources.filter((source) => ids.has(source.id));
});

/**
 * 逐選項理由。這是本題庫反盲猜的核心：干擾選項為何不選，
 * 和正確選項為何成立一樣重要。
 *
 * `tone` 是唯一的視覺訊號，三種題型共用同一個意思：
 *   hit  — 你在這一項上判斷正確
 *   miss — 你在這一項上判斷錯了
 *   idle — 你沒碰到的干擾選項，讀它的理由才是重點
 */
type Tone = "hit" | "miss" | "idle";
const rationales = computed(() => {
  const question = props.question;
  if (question.type === "yes-no-matrix") {
    return question.statements.map((statement, index) => {
      const matched =
        matrixValue(props.answer, statement.id) === statement.answer;
      return {
        key: statement.id,
        label: `${index + 1}. ${statement.text}`,
        verdict: statement.answer ? "正確" : "錯誤",
        tone: (matched ? "hit" : "miss") as Tone,
        text: statement.rationale,
      };
    });
  }
  if (question.type === "dropdown") {
    return question.segments.map((segment) => {
      const correct = segment.options.find(
        (option) => option.id === segment.answer,
      );
      const matched = segmentValue(props.answer, segment.id) === segment.answer;
      return {
        key: segment.id,
        label: `${segment.label}：${correct?.text ?? segment.answer}`,
        verdict: "正解",
        tone: (matched ? "hit" : "miss") as Tone,
        text: segment.rationale,
      };
    });
  }
  return questionOptions(question).map((option) => {
    const right = isCorrectOption(question, option.id);
    const picked = isOptionSelected(question, props.answer, option.id);
    return {
      key: option.id,
      label: option.text,
      verdict: right ? "正解" : "非解",
      tone: (right && picked
        ? "hit"
        : right || picked
          ? "miss"
          : "idle") as Tone,
      text: optionRationale(question, option.id),
    };
  });
});
</script>

<template>
  <div class="answer-explanation">
    <strong>正確答案</strong>
    <p>{{ answerText(question, correctAnswerOf(question)) }}</p>
    <p>{{ question.explanation }}</p>
  </div>
  <div class="rationale-block">
    <strong>逐項理由</strong>
    <ul class="rationale-list">
      <li v-for="item in rationales" :key="item.key" :data-tone="item.tone">
        <span class="rationale-verdict">{{ item.verdict }}</span>
        <div>
          <b>{{ item.label }}</b>
          <p>{{ item.text }}</p>
        </div>
      </li>
    </ul>
  </div>
  <div class="trap-note">
    <strong>常見陷阱</strong>
    <p>{{ question.trap }}</p>
  </div>
  <div class="answer-explanation">
    <strong>官方來源</strong>
    <p>
      <span v-for="(source, index) in questionSources" :key="source.id"
        ><a :href="source.url" target="_blank" rel="noopener">{{
          source.title
        }}</a
        >{{ index < questionSources.length - 1 ? "、" : "" }}</span
      >
    </p>
  </div>
</template>
