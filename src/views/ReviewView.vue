<script setup lang="ts">
import { computed, ref } from "vue";
import { review } from "../content";
import { progress, toggleReviewCheck } from "../store";
const exam = ref<"AZ-900" | "SC-900">("AZ-900");
const compact = ref(false);
const memories = computed(() => review.mustRemember[exam.value]);
</script>
<template>
  <section class="page-stack" :class="{ 'compact-review': compact }">
    <div class="page-intro">
      <div>
        <span class="badge badge--accent">考前 15 分鐘模式</span>
        <h2>考前速查</h2>
        <p>
          濃縮比較、必背句與應考清單。這一頁用於喚醒已學過的內容，不是考前十五分鐘才開始認識
          Azure。
        </p>
      </div>
      <label class="toggle-control"
        ><input v-model="compact" type="checkbox" />極簡速查</label
      >
    </div>
    <section class="panel">
      <div class="panel__header">
        <div>
          <p class="eyebrow">CHEATSHEET</p>
          <h2>一眼辨析</h2>
        </div>
        <button class="button button--ghost" @click="window.print()">
          列印
        </button>
      </div>
      <div class="cheat-grid">
        <div
          v-for="item in review.cheatsheet"
          :key="item.combination"
          class="cheat-item"
        >
          <strong>{{ item.combination }}</strong
          ><span>{{ item.summary }}</span>
        </div>
      </div>
    </section>
    <section class="panel">
      <div class="panel__header">
        <div>
          <p class="eyebrow">MUST REMEMBER</p>
          <h2>必背句</h2>
        </div>
        <div class="segmented-control" role="tablist">
          <button
            role="tab"
            :aria-selected="exam === 'AZ-900'"
            :class="{ active: exam === 'AZ-900' }"
            @click="exam = 'AZ-900'"
          >
            AZ-900</button
          ><button
            role="tab"
            :aria-selected="exam === 'SC-900'"
            :class="{ active: exam === 'SC-900' }"
            @click="exam = 'SC-900'"
          >
            SC-900
          </button>
        </div>
      </div>
      <ol class="memory-list">
        <li v-for="(line, index) in memories" :key="index">{{ line }}</li>
      </ol>
    </section>
    <section class="panel checklist-panel">
      <div class="panel__header">
        <div>
          <p class="eyebrow">EXAM DAY</p>
          <h2>應考日清單</h2>
        </div>
        <span class="muted"
          >{{ progress.reviewChecks.length }}／{{
            review.examDayChecklist.length
          }}</span
        >
      </div>
      <ul class="checklist">
        <li v-for="(item, index) in review.examDayChecklist" :key="index">
          <label
            ><input
              type="checkbox"
              :checked="progress.reviewChecks.includes(`exam-${index}`)"
              @change="toggleReviewCheck(`exam-${index}`)"
            /><span>{{ item }}</span></label
          >
        </li>
      </ul>
    </section>
  </section>
</template>
