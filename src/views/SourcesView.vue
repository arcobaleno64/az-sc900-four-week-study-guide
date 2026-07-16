<script setup lang="ts">
import { computed, nextTick, ref, watch } from "vue";
import { examMeta, sources } from "../content";
import { route } from "../router";
import { normalize } from "../utils";
const query = ref("");
const filtered = computed(() =>
  sources.filter(
    (s) =>
      !query.value ||
      normalize(`${s.id} ${s.title}`).includes(normalize(query.value)),
  ),
);
watch(
  () => route.param,
  async (id) => {
    if (!id) return;
    query.value = "";
    await nextTick();
    document
      .querySelector(`[data-source-id="${CSS.escape(id)}"]`)
      ?.scrollIntoView({ behavior: "smooth", block: "center" });
  },
  { immediate: true },
);
</script>
<template>
  <section class="page-stack">
    <div class="page-intro">
      <div>
        <span class="badge badge--accent">28 項 Microsoft Learn</span>
        <h2>官方來源</h2>
        <p>
          考綱、認證頁與產品文件集中於此。正式預約前仍應核對官方頁面，因為雲端產品更名的速度偶爾比人的筆記快。
        </p>
      </div>
      <div class="version-card">
        <span>最後核對</span><strong>{{ examMeta.lastVerified }}</strong
        ><small>所有連結均為 HTTPS</small>
      </div>
    </div>
    <div class="panel filter-bar filter-bar--two">
      <label class="filter-bar__search search-field"
        ><span class="sr-only">搜尋官方來源</span
        ><input
          v-model="query"
          type="search"
          placeholder="搜尋官方文件名稱" /></label
      ><span class="muted">{{ filtered.length }} 項結果</span>
    </div>
    <div class="source-grid">
      <article
        v-for="source in filtered"
        :key="source.id"
        class="source-card"
        :data-source-id="source.id"
      >
        <span class="source-id">{{ source.id }}</span>
        <div>
          <strong>{{ source.title }}</strong
          ><small>{{ source.publisher }}</small>
        </div>
        <a
          class="button button--ghost"
          :href="source.url"
          target="_blank"
          rel="noopener"
          >開啟官方頁面</a
        >
      </article>
    </div>
  </section>
</template>
