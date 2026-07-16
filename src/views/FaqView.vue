<script setup lang="ts">
import { computed, nextTick, ref, watch } from "vue";
import { faqs, qas } from "../content";
import { route } from "../router";
import { normalize } from "../utils";
const mode = ref<"faq" | "qa">("faq");
const query = ref("");
const category = ref("全部");
const open = ref<Set<string>>(new Set());
const items = computed(() => (mode.value === "faq" ? faqs : qas));
const categories = computed(() => [
  "全部",
  ...new Set(items.value.map((i) => i.category)),
]);
const filtered = computed(() =>
  items.value.filter(
    (i) =>
      (category.value === "全部" || i.category === category.value) &&
      (!query.value ||
        normalize(`${i.question} ${i.answer}`).includes(
          normalize(query.value),
        )),
  ),
);
function toggle(id: string) {
  const n = new Set(open.value);
  n.has(id) ? n.delete(id) : n.add(id);
  open.value = n;
}
async function focusRoute() {
  if (!route.param) return;
  const target = [...faqs, ...qas].find((x) => x.id === route.param);
  if (!target) return;
  mode.value = faqs.some((x) => x.id === target.id) ? "faq" : "qa";
  query.value = "";
  category.value = "全部";
  open.value = new Set([...open.value, target.id]);
  await nextTick();
  document
    .querySelector(`[data-faq-id="${CSS.escape(target.id)}"]`)
    ?.scrollIntoView({ behavior: "smooth", block: "center" });
}
watch(() => route.param, focusRoute, { immediate: true });
watch(mode, () => {
  category.value = "全部";
  query.value = "";
});
</script>
<template>
  <section class="page-stack">
    <div class="page-intro">
      <div>
        <span class="badge badge--accent">經審稿固定問答</span>
        <h2>FAQ／Q&A</h2>
        <p>
          FAQ 處理考試與操作問題；Q&A
          處理情境辨析。答案均來自本教材與官方範圍，不使用即興生成內容冒充規則。
        </p>
      </div>
    </div>
    <div
      class="segmented-control segmented-control--wide"
      role="tablist"
      aria-label="問答類型"
    >
      <button
        role="tab"
        :aria-selected="mode === 'faq'"
        :class="{ active: mode === 'faq' }"
        @click="mode = 'faq'"
      >
        FAQ（{{ faqs.length }}）</button
      ><button
        role="tab"
        :aria-selected="mode === 'qa'"
        :class="{ active: mode === 'qa' }"
        @click="mode = 'qa'"
      >
        觀念情境 Q&A（{{ qas.length }}）
      </button>
    </div>
    <div class="panel filter-bar filter-bar--two">
      <label class="filter-bar__search search-field"
        ><span class="sr-only">搜尋問題</span
        ><input
          v-model="query"
          type="search"
          placeholder="搜尋問題、產品或情境" /></label
      ><label
        >分類<select v-model="category">
          <option v-for="item in categories" :key="item">{{ item }}</option>
        </select></label
      >
    </div>
    <div class="panel__header">
      <strong>{{ filtered.length }} 個結果</strong
      ><button
        class="text-button"
        @click="open = new Set(filtered.map((i) => i.id))"
      >
        全部展開
      </button>
    </div>
    <div class="faq-list">
      <article
        v-for="item in filtered"
        :key="item.id"
        class="faq-item"
        :data-faq-id="item.id"
      >
        <button :aria-expanded="open.has(item.id)" @click="toggle(item.id)">
          <span class="badge">{{ item.category }}</span
          ><strong>{{ item.question }}</strong
          ><span>{{ open.has(item.id) ? "−" : "＋" }}</span>
        </button>
        <div v-if="open.has(item.id)" class="faq-answer">
          <p>{{ item.answer }}</p>
          <div v-if="item.keyWords?.length" class="keyword-row">
            <span v-for="word in item.keyWords" :key="word" class="chip">{{
              word
            }}</span>
          </div>
        </div>
      </article>
    </div>
    <div v-if="!filtered.length" class="empty-card">
      <strong>沒有符合的問題</strong><span>請改用服務名稱或題幹動詞搜尋。</span>
    </div>
  </section>
</template>
