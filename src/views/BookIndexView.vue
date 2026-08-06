<script setup lang="ts">
import { computed, ref } from "vue";
import { bookIndexEntries } from "../content";
import { groupIndex } from "../book-index";
import { navigate } from "../router";
import { normalize } from "../utils";

const filter = ref("");
const scope = ref<"all" | "chapter" | "glossary" | "quiz">("all");

const matches = computed(() => {
  const q = normalize(filter.value.trim());
  return bookIndexEntries.filter((entry) => {
    if (q && !normalize(entry.term).includes(q)) return false;
    if (scope.value === "chapter") return entry.sections.length > 0;
    if (scope.value === "glossary") return Boolean(entry.glossaryId);
    if (scope.value === "quiz") return entry.questionCount > 0;
    return true;
  });
});
const groups = computed(() => groupIndex(matches.value));
const totals = computed(() => ({
  all: bookIndexEntries.length,
  chapter: bookIndexEntries.filter((e) => e.sections.length).length,
  glossary: bookIndexEntries.filter((e) => e.glossaryId).length,
  quiz: bookIndexEntries.filter((e) => e.questionCount).length,
}));
</script>

<template>
  <section class="page-stack">
    <div class="page-intro">
      <div>
        <span class="badge badge--accent">{{ totals.all }} 條索引</span>
        <h2>索引</h2>
        <p>
          索引不解釋名詞，它告訴你這個詞在正文的哪一節出現過。所有條目都由章節原文、名詞庫與題目關鍵字推導，沒有為了湊版面而列的詞。
        </p>
      </div>
      <div class="version-card">
        <span>排序</span><strong>拉丁字母／部首</strong
        ><small>中文以碼位排序，接近部首筆畫順</small>
      </div>
    </div>

    <div class="panel">
      <div class="filter-bar filter-bar--two">
        <label class="search-field search-field--large"
          ><span class="sr-only">搜尋索引</span
          ><input v-model="filter" type="search" placeholder="搜尋索引詞條"
        /></label>
        <label
          >收錄範圍<select v-model="scope">
            <option value="all">全部（{{ totals.all }}）</option>
            <option value="chapter">正文有出現（{{ totals.chapter }}）</option>
            <option value="glossary">
              名詞庫有詞條（{{ totals.glossary }}）
            </option>
            <option value="quiz">題目有考（{{ totals.quiz }}）</option>
          </select></label
        >
      </div>
    </div>

    <p v-if="!matches.length" class="empty-card">
      <strong>沒有符合的索引詞條</strong>
      換個關鍵字，或把收錄範圍改回全部。
    </p>

    <section
      v-for="group in groups"
      :key="group.group"
      class="panel index-group"
    >
      <h3 class="index-group__mark readout">{{ group.group }}</h3>
      <dl class="index-list">
        <template v-for="entry in group.entries" :key="entry.term">
          <dt>{{ entry.term }}</dt>
          <dd>
            <span v-if="entry.sections.length" class="index-refs">
              <button
                v-for="section in entry.sections"
                :key="section.label + section.anchor"
                class="index-ref"
                :title="section.title"
                @click="
                  navigate('knowledge', section.chapterId, {
                    h: section.anchor,
                  })
                "
              >
                <span v-if="section.label" class="readout"
                  >§{{ section.label }}</span
                >
                <span>{{ section.title }}</span>
              </button>
            </span>
            <span class="index-meta">
              <button
                v-if="entry.glossaryId"
                class="text-button"
                @click="navigate('glossary', entry.glossaryId)"
              >
                名詞庫
              </button>
              <span v-if="entry.questionCount" class="readout"
                >{{ entry.questionCount }} 題</span
              >
              <span v-if="!entry.sections.length" class="muted"
                >正文未直接出現</span
              >
            </span>
          </dd>
        </template>
      </dl>
    </section>
  </section>
</template>
