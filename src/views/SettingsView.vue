<script setup lang="ts">
import { ref } from "vue";
import { examMeta } from "../content";
import {
  exportProgress,
  importProgress,
  progress,
  resetProgress,
  setExamDate,
  setTheme,
} from "../store";
import { downloadJson } from "../utils";
import { showToast } from "../toast";
import type { ExamCode, ThemeMode } from "../types";
const fileInput = ref<HTMLInputElement | null>(null);
function exportData() {
  downloadJson(
    `az-sc900-study-progress-${new Date().toISOString().slice(0, 10)}.json`,
    exportProgress(),
  );
  showToast("學習紀錄已匯出。", "success");
}
async function importData(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (!file) return;
  try {
    importProgress(JSON.parse(await file.text()));
    showToast("學習紀錄已匯入。", "success");
  } catch (error) {
    showToast(
      error instanceof Error ? error.message : "無法匯入檔案。",
      "warning",
    );
  } finally {
    if (fileInput.value) fileInput.value.value = "";
  }
}
function changeDate(code: ExamCode, event: Event) {
  setExamDate(code, (event.target as HTMLInputElement).value);
}
function reset() {
  if (
    !window.confirm(
      "確定清除所有學習進度、錯題、收藏與備忘嗎？此操作無法復原。",
    )
  )
    return;
  resetProgress();
  showToast("所有本機學習紀錄已清除。", "success");
}
</script>
<template>
  <section class="page-stack">
    <div class="page-intro">
      <div>
        <span class="badge badge--accent">本機資料控制</span>
        <h2>設定</h2>
        <p>
          管理考試日期、顯示主題與學習紀錄。此版本沒有帳號與後端資料庫，進度不會離開你的瀏覽器。
        </p>
      </div>
    </div>
    <div class="settings-grid">
      <section class="panel">
        <div class="panel__header">
          <div>
            <p class="eyebrow">EXAM DATES</p>
            <h2>考試日期</h2>
          </div>
        </div>
        <div class="settings-fields">
          <label v-for="exam in examMeta.exams" :key="exam.code"
            ><span>{{ exam.code }}</span
            ><input
              type="date"
              :value="progress.examDates[exam.code] || ''"
              @change="changeDate(exam.code, $event)"
            /><small>新版考綱生效：{{ exam.effectiveDate }}</small></label
          >
        </div>
      </section>
      <section class="panel">
        <div class="panel__header">
          <div>
            <p class="eyebrow">APPEARANCE</p>
            <h2>顯示主題</h2>
          </div>
        </div>
        <div class="theme-options">
          <label
            v-for="item in [
              ['system', '跟隨系統'],
              ['light', '淺色'],
              ['dark', '深色'],
            ] as [ThemeMode, string][]"
            :key="item[0]"
            ><input
              type="radio"
              name="theme"
              :value="item[0]"
              :checked="progress.theme === item[0]"
              @change="setTheme(item[0])"
            />{{ item[1] }}</label
          >
        </div>
      </section>
      <section class="panel panel--span-2">
        <div class="panel__header">
          <div>
            <p class="eyebrow">BACKUP</p>
            <h2>匯出與匯入</h2>
          </div>
        </div>
        <p>
          匯出檔包含完成天數、備忘、題目統計、錯題、收藏、熟悉度與設定。請自行妥善保存，JSON
          不會神秘地長出雲端同步。
        </p>
        <div class="settings-actions">
          <button class="button button--primary" @click="exportData">
            匯出學習紀錄</button
          ><button class="button button--ghost" @click="fileInput?.click()">
            匯入學習紀錄</button
          ><input
            ref="fileInput"
            class="sr-only"
            type="file"
            aria-label="選擇要匯入的學習紀錄 JSON 檔"
            accept="application/json,.json"
            @change="importData"
          />
        </div>
      </section>
      <section class="panel privacy-panel">
        <div class="panel__header"><h2>隱私與儲存</h2></div>
        <div class="two-column-text">
          <section>
            <h3>保存在本機</h3>
            <p>
              所有學習紀錄使用瀏覽器
              localStorage。更換裝置、瀏覽器或清除網站資料後，不會自動復原。
            </p>
          </section>
          <section>
            <h3>不包含後端</h3>
            <p>
              此版本沒有登入、留言、提問資料庫或 AI
              即時回答。部署者若另加分析工具，應自行更新隱私說明。
            </p>
          </section>
        </div>
      </section>
      <section class="panel danger-panel">
        <div class="panel__header"><h2>重設全部資料</h2></div>
        <p>清除完成進度、錯題、測驗紀錄、收藏、備忘與考試日期。無法復原。</p>
        <button class="button button--danger" @click="reset">
          清除所有本機紀錄
        </button>
      </section>
    </div>
    <section class="notice">
      <strong>版本聲明：</strong>{{ examMeta.disclaimer }}
    </section>
  </section>
</template>
