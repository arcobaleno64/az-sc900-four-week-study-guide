<script setup lang="ts">
import { ref, useId } from "vue";
import type { CaseStudy } from "../types";

defineProps<{ caseStudy: CaseStudy }>();
const open = ref(true);
// aria-controls 需要一個穩定且唯一的 id；同一輪可能出現多個案例面板。
const bodyId = useId();
</script>

<template>
  <section
    class="case-panel"
    :data-open="open"
    :data-kind="caseStudy.kind ?? 'scenario'"
  >
    <header>
      <div>
        <p class="eyebrow">
          {{ caseStudy.kind === "solution-set" ? "Solution set" : "Case" }}
        </p>
        <h3>{{ caseStudy.title }}</h3>
      </div>
      <!-- 這是可收合區塊，狀態要讓輔助科技讀得到，不能只靠按鈕文字。 -->
      <button
        type="button"
        class="text-button"
        :aria-expanded="open"
        :aria-controls="bodyId"
        @click="open = !open"
      >
        {{ open ? "收合背景" : "展開背景" }}
      </button>
    </header>
    <div v-show="open" :id="bodyId">
      <p>{{ caseStudy.scenario }}</p>
      <ul class="case-requirements">
        <li v-for="(item, index) in caseStudy.requirements" :key="index">
          {{ item }}
        </li>
      </ul>
      <!--
        重複情境題組的規則必須先講清楚，否則使用者會以為只有一個解法對，
        或以為前一題的判斷會影響後一題。
      -->
      <p v-if="caseStudy.kind === 'solution-set'" class="case-rule">
        本組每題提出<b>不同的</b>解法，各自獨立判斷與計分。可能有多個解法成立，也可能全都不成立。
      </p>
    </div>
  </section>
</template>
