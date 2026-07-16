<script setup lang="ts">
import { computed, nextTick, ref, watch } from "vue";
import { studyPlan } from "../content";
import { progress, setDayNote, toggleDay } from "../store";
import { route } from "../router";
import { percent } from "../utils";
const selectedWeek = ref(
  Math.min(
    4,
    Math.max(
      1,
      Math.ceil(
        (studyPlan.weeks
          .flatMap((w) => w.days)
          .find((d) => !progress.completedDays.includes(d.day))?.day ?? 28) / 7,
      ),
    ),
  ),
);
const showAll = ref(false);
const expanded = ref<Set<number>>(new Set());
const visibleWeeks = computed(() =>
  showAll.value
    ? studyPlan.weeks
    : studyPlan.weeks.filter((w) => w.week === selectedWeek.value),
);
const allDays = studyPlan.weeks.flatMap((w) => w.days);
const completion = computed(() =>
  percent(progress.completedDays.length, allDays.length),
);
function toggleOpen(day: number) {
  const n = new Set(expanded.value);
  n.has(day) ? n.delete(day) : n.add(day);
  expanded.value = n;
}
async function focusRoute() {
  const day = Number(route.param);
  if (!day) return;
  selectedWeek.value = Math.ceil(day / 7);
  expanded.value = new Set([...expanded.value, day]);
  await nextTick();
  document
    .querySelector(`[data-day="${day}"]`)
    ?.scrollIntoView({ behavior: "smooth", block: "start" });
}
watch(() => route.param, focusRoute, { immediate: true });
</script>
<template>
  <section class="page-stack">
    <div class="page-intro">
      <div>
        <span class="badge badge--accent">28 天密集節奏</span>
        <h2>四週計畫</h2>
        <p>
          每一天都包含必讀內容、當日輸出與通關標準。勾選完成不是裝飾，下一次開啟仍會保留。
        </p>
      </div>
      <div class="compact-progress">
        <strong>{{ completion }}%</strong
        ><span>{{ progress.completedDays.length }}／28 天完成</span>
        <div class="meter">
          <span :style="{ width: `${completion}%` }"></span>
        </div>
      </div>
    </div>
    <div class="panel plan-summary">
      <div class="week-tabs" role="tablist" aria-label="週次">
        <button
          v-for="week in studyPlan.weeks"
          :key="week.week"
          role="tab"
          :aria-selected="selectedWeek === week.week && !showAll"
          :class="{ active: selectedWeek === week.week && !showAll }"
          @click="
            selectedWeek = week.week;
            showAll = false;
          "
        >
          第 {{ week.week }} 週
        </button>
      </div>
      <label class="toggle-control"
        ><input v-model="showAll" type="checkbox" />顯示全部 28 天</label
      >
    </div>
    <div class="day-list">
      <template v-for="week in visibleWeeks" :key="week.id"
        ><article
          v-for="day in week.days"
          :key="day.day"
          class="day-card"
          :data-day="day.day"
          :data-completed="progress.completedDays.includes(day.day)"
        >
          <div class="day-card__summary" @click="toggleOpen(day.day)">
            <span class="day-number">{{ day.day }}</span>
            <div>
              <div class="day-card__top">
                <span class="badge">{{ day.exam }}</span>
                <h3>{{ day.title }}</h3>
              </div>
              <p class="muted">{{ day.reading }}</p>
              <label class="day-check" @click.stop
                ><input
                  type="checkbox"
                  :checked="progress.completedDays.includes(day.day)"
                  :aria-label="`標記第 ${day.day} 天為完成`"
                  @change="toggleDay(day.day)"
                />完成</label
              >
            </div>
            <button
              class="chevron"
              :aria-label="expanded.has(day.day) ? '收合' : '展開'"
              @click.stop="toggleOpen(day.day)"
            >
              {{ expanded.has(day.day) ? "−" : "＋" }}
            </button>
          </div>
          <div v-if="expanded.has(day.day)" class="day-card__details">
            <section>
              <span class="detail-label">必讀內容</span>
              <p>{{ day.reading }}</p>
            </section>
            <section>
              <span class="detail-label">當日輸出</span>
              <p>{{ day.output }}</p>
            </section>
            <section>
              <span class="detail-label">通關標準</span>
              <p>{{ day.passCriteria }}</p>
            </section>
            <label class="note-field"
              ><span class="detail-label">個人備忘</span
              ><textarea
                :value="progress.dayNotes[String(day.day)] || ''"
                placeholder="記錄易錯點、關鍵字或明日複習項目"
                @input="
                  setDayNote(
                    day.day,
                    ($event.target as HTMLTextAreaElement).value,
                  )
                "
              ></textarea>
            </label>
          </div></article
      ></template>
    </div>
    <section class="panel">
      <div class="panel__header">
        <div>
          <p class="eyebrow">ERROR TAXONOMY</p>
          <h2>錯題分類法</h2>
        </div>
      </div>
      <div class="responsive-table">
        <table>
          <thead>
            <tr>
              <th>錯題類型</th>
              <th>症狀</th>
              <th>修正方式</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in studyPlan.wrongAnswerMethod" :key="item.type">
              <td>
                <strong>{{ item.type }}</strong>
              </td>
              <td>{{ item.symptom }}</td>
              <td>{{ item.remedy }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </section>
</template>
