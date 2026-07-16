<script setup lang="ts">
import { computed, nextTick, ref, watch } from "vue";
import { marked, Renderer } from "marked";
import { chapters, examMeta } from "../content";
import { navigate, route } from "../router";
import { normalize } from "../utils";
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
const html = computed(() =>
  String(marked.parse(active.value.raw, { renderer })).replace(
    /<h([123])>(.*?)<\/h\1>/g,
    (_, level, text) => {
      const plain = String(text).replace(/<[^>]+>/g, "");
      const id = plain
        .toLowerCase()
        .replace(/[^a-z0-9\u4e00-\u9fff]+/g, "-")
        .replace(/(^-|-$)/g, "");
      return `<h${level} id="${id}">${text}</h${level}>`;
    },
  ),
);
const headings = computed(() => {
  const lines = active.value.raw.split("\n");
  return lines
    .filter((l) => /^#{2,3}\s/.test(l))
    .map((l) => ({
      level: l.startsWith("###") ? 3 : 2,
      title: l.replace(/^#{2,3}\s*/, ""),
      id: l
        .replace(/^#{2,3}\s*/, "")
        .toLowerCase()
        .replace(/[^a-z0-9\u4e00-\u9fff]+/g, "-")
        .replace(/(^-|-$)/g, ""),
    }))
    .filter(
      (h) =>
        !filter.value || normalize(h.title).includes(normalize(filter.value)),
    );
});
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
        ><small>{{ chapter.exam }}</small>
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
            {{ heading.title }}</button
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
