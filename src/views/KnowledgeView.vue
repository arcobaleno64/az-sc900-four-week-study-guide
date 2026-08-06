<script setup lang="ts">
import { computed, nextTick, ref, watch } from "vue";
import { marked, Renderer } from "marked";
import { chapters, examMeta } from "../content";
import { navigate, route } from "../router";
import { normalize } from "../utils";
import { headingAnchor, sectionsOf } from "../book-index";
const initial = chapters.some((c) => c.id === route.param)
  ? route.param
  : "start-here";
const activeId = ref(initial);
const filter = ref("");
const active = computed(
  () => chapters.find((c) => c.id === activeId.value) ?? chapters[0],
);
const renderer = new Renderer();
renderer.link = ({ href, title, text }) =>
  `<a href="${href}" ${title ? `title="${title}"` : ""} target="_blank" rel="noopener">${text}</a>`;
renderer.table = ({ header, rows }) => {
  const headerHtml = renderer.tablerow({
    text: header.map((cell) => renderer.tablecell(cell)).join(""),
  });
  const bodyHtml = rows
    .map((row) =>
      renderer.tablerow({
        text: row.map((cell) => renderer.tablecell(cell)).join(""),
      }),
    )
    .join("");
  return `<div class="markdown-table"><table><thead>${headerHtml}</thead><tbody>${bodyHtml}</tbody></table></div>`;
};
/** \u672c\u7ae0\u6240\u6709\u7bc0\u7684\u7de8\u865f\uff0c\u9806\u5e8f\u8207 Markdown \u4e2d\u7684\u51fa\u73fe\u9806\u5e8f\u4e00\u81f4\u3002 */
const sections = computed(() =>
  sectionsOf({
    id: active.value.id,
    title: active.value.title,
    number: active.value.number,
    raw: active.value.raw,
  }),
);

const html = computed(() => {
  // \u7bc0\u865f\u5f9e\u539f\u6587\u6a19\u984c\u88e1\u89e3\u6790\u51fa\u4f86\uff0c\u62bd\u6210\u7368\u7acb\u6a19\u8a18\u5f8c\u6a19\u984c\u53ea\u7559\u6587\u5b57\uff0c
  // \u5426\u5247\u6703\u8b8a\u6210\u300c1.1\u30001.1\u3000\u4e00\u53e5\u8a71\u5b9a\u4f4d\u300d\u9019\u7a2e\u91cd\u8907\u3002
  let cursor = 0;
  return String(marked.parse(active.value.raw, { renderer })).replace(
    /<h([123])>(.*?)<\/h\1>/g,
    (_, level, text) => {
      const plain = String(text).replace(/<[^>]+>/g, "");
      const id = headingAnchor(plain);
      if (level === "1") return `<h1 id="${id}">${text}</h1>`;
      const section = sections.value[cursor++];
      const mark = section?.label
        ? `<span class="section-mark readout">${section.label}</span>`
        : "";
      return `<h${level} id="${id}">${mark}${section?.title ?? text}</h${level}>`;
    },
  );
});

const headings = computed(() =>
  sections.value
    .map((section) => ({
      level: section.label.includes(".") ? 3 : 2,
      label: section.label,
      title: section.title,
      id: section.anchor,
    }))
    .filter(
      (h) =>
        !filter.value ||
        normalize(`${h.label} ${h.title}`).includes(normalize(filter.value)),
    ),
);
/** 分頁顯示該檔涵蓋的章次，例如「第 1–3 章」；前言沒有章次。 */
function chapterRange(id: string): string {
  const chapter = chapters.find((c) => c.id === id);
  if (!chapter) return "";
  const majors = sectionsOf({
    id: chapter.id,
    title: chapter.title,
    number: chapter.number,
    raw: chapter.raw,
  })
    .map((section) => Number(section.label.split(".")[0]))
    .filter((value) => Number.isInteger(value) && value > 0);
  if (!majors.length) return "前言";
  const min = Math.min(...majors);
  const max = Math.max(...majors);
  return min === max ? `第 ${min} 章` : `第 ${min}–${max} 章`;
}

function choose(id: string) {
  activeId.value = id;
  navigate("knowledge", id);
  filter.value = "";
}
async function jump(id: string) {
  await nextTick();
  document
    .getElementById(id)
    ?.scrollIntoView({ behavior: "smooth", block: "start" });
}
watch(
  () => route.param,
  (id) => {
    if (chapters.some((c) => c.id === id)) activeId.value = id;
  },
);
</script>
<template>
  <section class="page-stack">
    <div class="page-intro">
      <div>
        <span class="badge badge--accent">結構化教材</span>
        <h2>必備知識</h2>
        <p>
          章節由原始參考書轉為
          Markdown，搭配目錄、搜尋與官方版本資訊。內容可維護，不再把 Word
          當成半永久資料庫。
        </p>
      </div>
      <div class="version-card">
        <span>資料基準</span><strong>{{ examMeta.lastVerified }}</strong
        ><a
          href="https://learn.microsoft.com/credentials/certifications/browse/"
          target="_blank"
          rel="noopener"
          >核對官方認證頁</a
        >
      </div>
    </div>
    <div class="document-tabs" role="tablist" aria-label="教材章節">
      <button
        v-for="chapter in chapters"
        :key="chapter.id"
        role="tab"
        :aria-selected="activeId === chapter.id"
        :class="{ active: activeId === chapter.id }"
        @click="choose(chapter.id)"
      >
        <strong>{{ chapter.title }}</strong
        ><small class="readout">{{ chapterRange(chapter.id) }}</small>
      </button>
    </div>
    <div class="knowledge-layout">
      <aside class="panel knowledge-nav">
        <label class="search-field"
          ><span class="sr-only">搜尋本章標題</span
          ><input v-model="filter" type="search" placeholder="搜尋本章標題"
        /></label>
        <nav aria-label="章節目錄">
          <button
            v-for="heading in headings"
            :key="heading.id"
            :class="{ nested: heading.level === 3 }"
            @click="jump(heading.id)"
          >
            <span class="readout">{{ heading.label }}</span
            >{{ heading.title }}</button
          ><span v-if="!headings.length" class="muted">沒有符合的標題。</span>
        </nav>
      </aside>
      <article
        class="panel knowledge-article markdown-body"
        v-html="html"
      ></article>
    </div>
  </section>
</template>
