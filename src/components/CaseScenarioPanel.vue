<script setup lang="ts">
import { ref } from "vue";
import type { CaseStudy } from "../types";

defineProps<{ caseStudy: CaseStudy }>();
const open = ref(true);
</script>

<template>
  <section class="case-panel" :data-open="open">
    <header>
      <div>
        <p class="eyebrow">CASE</p>
        <h3>{{ caseStudy.title }}</h3>
      </div>
      <button class="text-button" @click="open = !open">
        {{ open ? "收合背景" : "展開背景" }}
      </button>
    </header>
    <template v-if="open">
      <p>{{ caseStudy.scenario }}</p>
      <ul class="case-requirements">
        <li v-for="(item, index) in caseStudy.requirements" :key="index">
          {{ item }}
        </li>
      </ul>
    </template>
  </section>
</template>
