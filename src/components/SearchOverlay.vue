<script setup lang="ts">
import { computed, nextTick, ref, watch } from "vue";
import { navigate } from "../router";
import { searchContent } from "../content";
const props = defineProps<{ open: boolean }>();
const emit = defineEmits<{ close: [] }>();
const query = ref("");
const input = ref<HTMLInputElement | null>(null);
const results = computed(() => searchContent(query.value));
watch(
  () => props.open,
  async (open) => {
    if (open) {
      query.value = "";
      await nextTick();
      input.value?.focus();
    }
  },
);
function choose(item: ReturnType<typeof searchContent>[number]) {
  navigate(item.route, item.param ?? "");
  emit("close");
}
</script>
<template>
  <div
    v-if="open"
    class="overlay"
    role="dialog"
    aria-modal="true"
    aria-label="全站搜尋"
    @keydown.esc="emit('close')"
  >
    <button
      class="overlay-backdrop"
      aria-label="關閉搜尋"
      @click="emit('close')"
    ></button>
    <section class="search-dialog">
      <header class="search-dialog__header">
        <div>
          <p class="eyebrow">SEARCH</p>
          <h2>全站搜尋</h2>
        </div>
        <button
          class="icon-button"
          aria-label="關閉搜尋"
          @click="emit('close')"
        >
          ×
        </button>
      </header>
      <label class="search-field search-field--large"
        ><span class="sr-only">搜尋關鍵字</span
        ><input
          ref="input"
          v-model="query"
          type="search"
          placeholder="例如：Conditional Access、Policy、DLP"
        /><kbd>Esc</kbd></label
      >
      <div class="search-results" aria-live="polite">
        <button
          v-for="item in results"
          :key="`${item.type}-${item.id}`"
          class="search-result"
          @click="choose(item)"
        >
          <span class="chip">{{ item.type }}</span
          ><strong>{{ item.title }}</strong
          ><span>{{ item.excerpt }}</span>
        </button>
        <div v-if="query && !results.length" class="empty-card">
          <strong>沒有找到結果</strong
          ><span>請改用產品名稱、縮寫或題幹動詞。</span>
        </div>
        <div v-if="!query" class="empty-card">
          <strong>搜尋教材、題目、名詞與問答</strong
          ><span
            >輸入至少一個關鍵字。人腦可以模糊聯想，搜尋框通常沒那麼浪漫。</span
          >
        </div>
      </div>
    </section>
  </div>
</template>
