<script setup lang="ts">
import {
  computed,
  onBeforeUnmount,
  onMounted,
  ref,
  watch,
  type Component,
} from "vue";
import { cycleTheme, progress } from "./store";
import { navigate, route, routeTitles } from "./router";
import { bookParts, markLabel } from "./book";
import DashboardView from "./views/DashboardView.vue";
import PlanView from "./views/PlanView.vue";
import KnowledgeView from "./views/KnowledgeView.vue";
import GlossaryView from "./views/GlossaryView.vue";
import QuizView from "./views/QuizView.vue";
import FaqView from "./views/FaqView.vue";
import ReviewView from "./views/ReviewView.vue";
import SourcesView from "./views/SourcesView.vue";
import SettingsView from "./views/SettingsView.vue";
import BookIndexView from "./views/BookIndexView.vue";
import SearchOverlay from "./components/SearchOverlay.vue";
import ToastHost from "./components/ToastHost.vue";
import { showToast } from "./toast";
import { examMeta } from "./content";
import type { RouteName } from "./types";

const mobileOpen = ref(false);
const searchOpen = ref(false);
const installPrompt = ref<Event | null>(null);
const views: Record<RouteName, Component> = {
  dashboard: DashboardView,
  plan: PlanView,
  knowledge: KnowledgeView,
  glossary: GlossaryView,
  quiz: QuizView,
  faq: FaqView,
  review: ReviewView,
  sources: SourcesView,
  bookIndex: BookIndexView,
  settings: SettingsView,
};
const currentView = computed(() => views[route.name]);
const title = computed(() => routeTitles[route.name]);
const themeLabels: Record<string, string> = {
  system: "跟隨系統",
  light: "淺色",
  dark: "深色",
};
const themeLabel = computed(
  () => themeLabels[progress.theme] ?? progress.theme,
);
const currentMark = computed(() => markLabel(route.name));
watch(
  () => route.name,
  () => {
    mobileOpen.value = false;
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  },
);
function onKey(event: KeyboardEvent) {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
    event.preventDefault();
    searchOpen.value = true;
  }
  if (event.key === "Escape") {
    searchOpen.value = false;
    mobileOpen.value = false;
  }
}
function captureInstall(event: Event) {
  event.preventDefault();
  installPrompt.value = event;
}
async function install() {
  const prompt = installPrompt.value as Event & {
    prompt?: () => Promise<void>;
    userChoice?: Promise<{ outcome: string }>;
  };
  if (!prompt.prompt) return;
  await prompt.prompt();
  const choice = await prompt.userChoice;
  if (choice?.outcome === "accepted") showToast("已送出安裝要求。", "success");
  installPrompt.value = null;
}
onMounted(() => {
  window.addEventListener("keydown", onKey);
  window.addEventListener(
    "beforeinstallprompt",
    captureInstall as EventListener,
  );
});
onBeforeUnmount(() => {
  window.removeEventListener("keydown", onKey);
  window.removeEventListener(
    "beforeinstallprompt",
    captureInstall as EventListener,
  );
});
</script>
<template>
  <a class="skip-link" href="#main-content">跳到主要內容</a>
  <div class="app-shell">
    <aside class="sidebar" :class="{ 'sidebar--open': mobileOpen }">
      <div class="brand">
        <div class="brand-mark" aria-hidden="true">
          <span>AZ</span><span>SC</span>
        </div>
        <div>
          <strong class="readout">AZ-900 × SC-900</strong
          ><small>認證參考書　第 1 版</small>
        </div>
      </div>
      <nav class="primary-nav" aria-label="主要導覽">
        <template v-for="part in bookParts" :key="part.title">
          <p class="nav-part">{{ part.title }}</p>
          <button
            v-for="item in part.entries"
            :key="item.name"
            class="nav-item"
            :class="{ 'nav-item--active': route.name === item.name }"
            :aria-current="route.name === item.name ? 'page' : undefined"
            @click="navigate(item.name)"
          >
            <span class="nav-item__icon readout" aria-hidden="true">{{
              item.mark
            }}</span
            ><span>{{ item.label }}</span>
          </button>
        </template>
      </nav>
      <footer class="sidebar-footer">
        <button
          class="nav-item"
          :class="{ 'nav-item--active': route.name === 'settings' }"
          :aria-current="route.name === 'settings' ? 'page' : undefined"
          @click="navigate('settings')"
        >
          <span class="nav-item__icon" aria-hidden="true">
            <svg
              viewBox="0 0 24 24"
              width="16"
              height="16"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <circle cx="12" cy="12" r="3" />
              <path
                d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9v0a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z"
              />
            </svg> </span
          ><span>設定</span>
        </button>
        <small>資料基準：{{ examMeta.lastVerified }}</small>
      </footer>
    </aside>
    <button
      v-if="mobileOpen"
      class="mobile-backdrop"
      aria-label="關閉導覽"
      @click="mobileOpen = false"
    ></button>
    <div class="app-main">
      <header class="topbar">
        <div class="topbar__leading">
          <button
            class="icon-button mobile-menu"
            aria-label="開啟導覽"
            @click="mobileOpen = true"
          >
            ☰
          </button>
          <div>
            <!-- 書眉：告訴讀者現在翻到書的哪一部分。 -->
            <p class="eyebrow">{{ currentMark || "AZ-900 × SC-900" }}</p>
            <h1>{{ title }}</h1>
          </div>
        </div>
        <div class="topbar__actions">
          <button
            v-if="installPrompt"
            class="button button--soft"
            @click="install"
          >
            安裝
          </button>
          <button
            class="search-trigger"
            aria-label="開啟全站搜尋"
            @click="searchOpen = true"
          >
            <svg
              class="search-trigger__icon"
              viewBox="0 0 24 24"
              width="18"
              height="18"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <circle cx="11" cy="11" r="6.5" />
              <path d="m15.6 15.6 4.2 4.2" />
            </svg>
            <span>搜尋教材與題庫</span><kbd>Ctrl K</kbd>
          </button>
          <button
            class="icon-button theme-button"
            :aria-label="`切換顯示主題，目前為${themeLabel}`"
            :title="themeLabel"
            @click="cycleTheme"
          >
            <svg
              v-if="progress.theme === 'light'"
              viewBox="0 0 24 24"
              width="18"
              height="18"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <circle cx="12" cy="12" r="4" />
              <path
                d="M12 3v2M12 19v2M5.64 5.64l1.42 1.42M16.94 16.94l1.42 1.42M3 12h2M19 12h2M5.64 18.36l1.42-1.42M16.94 7.06l1.42-1.42"
              />
            </svg>
            <svg
              v-else-if="progress.theme === 'dark'"
              viewBox="0 0 24 24"
              width="18"
              height="18"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5Z" />
            </svg>
            <svg
              v-else
              viewBox="0 0 24 24"
              width="18"
              height="18"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <rect x="3" y="4" width="18" height="13" rx="2" />
              <path d="M8 21h8M12 17v4" />
            </svg>
          </button>
        </div>
      </header>
      <main id="main-content" class="content-area">
        <component :is="currentView" />
      </main>
    </div>
  </div>
  <SearchOverlay :open="searchOpen" @close="searchOpen = false" />
  <ToastHost />
</template>
