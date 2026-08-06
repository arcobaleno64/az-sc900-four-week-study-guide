<script setup lang="ts">
import { computed } from "vue";
import { examMeta, questions, studyDays, summary, terms } from "../content";
import { completedCount, progress, wrongCount } from "../store";
import { navigate } from "../router";
import { daysUntil, formatDateTime, percent } from "../utils";
const completion = computed(() =>
  percent(completedCount.value, studyDays.length),
);
const nextDay = computed(
  () =>
    studyDays.find((d) => !progress.completedDays.includes(d.day)) ??
    studyDays.at(-1)!,
);
const recentAttempts = computed(() => progress.quizAttempts.slice(0, 4));
const questionAttempts = computed(() =>
  Object.values(progress.questionStats).reduce((sum, s) => sum + s.attempts, 0),
);
const accuracy = computed(() => {
  const stats = Object.values(progress.questionStats);
  const total = stats.reduce((s, x) => s + x.attempts, 0);
  const correct = stats.reduce((s, x) => s + x.correct, 0);
  return percent(correct, total);
});
const weakDomains = computed(() => {
  const map = new Map<string, { correct: number; total: number }>();
  for (const q of questions) {
    const s = progress.questionStats[q.id];
    if (!s) continue;
    const v = map.get(q.domain) ?? { correct: 0, total: 0 };
    v.correct += s.correct;
    v.total += s.attempts;
    map.set(q.domain, v);
  }
  return [...map]
    .map(([name, v]) => ({
      name,
      score: percent(v.correct, v.total),
      total: v.total,
    }))
    .sort((a, b) => a.score - b.score)
    .slice(0, 4);
});
function countdown(date: string) {
  const d = daysUntil(date);
  return d === null
    ? "未設定"
    : d < 0
      ? `已過 ${Math.abs(d)} 天`
      : d === 0
        ? "今天"
        : `還有 ${d} 天`;
}
</script>
<template>
  <section class="page-stack">
    <div class="page-intro">
      <div>
        <span class="badge badge--accent">2 科／1 個入口</span>
        <h2>總覽</h2>
        <p>
          把教材、題庫、名詞與複習節奏放在同一個地方。進度只保存在這個瀏覽器，不會為了幾個核取方塊替你建立另一套會員宇宙。
        </p>
      </div>
    </div>

    <!--
      版次頁。對一本認證參考書來說，時效就是全部的價值 ——
      讀者第一件該知道的事是這本書對到哪一版考綱、以及它不是什麼。
    -->
    <section class="panel colophon">
      <p class="eyebrow">Colophon</p>
      <h2>關於這本書</h2>
      <dl class="colophon-grid">
        <div>
          <dt class="readout--label">版次</dt>
          <dd class="readout">第 1 版</dd>
        </div>
        <div>
          <dt class="readout--label">資料基準</dt>
          <dd class="readout">{{ examMeta.lastVerified }}</dd>
        </div>
        <div v-for="exam in examMeta.exams" :key="exam.code">
          <dt class="readout--label">{{ exam.code }} 技能清單</dt>
          <dd class="readout">{{ exam.effectiveDate }}</dd>
        </div>
        <div>
          <dt class="readout--label">收錄</dt>
          <dd>
            <span class="readout">{{ summary.questions }}</span> 題、<span
              class="readout"
              >{{ terms.length }}</span
            >
            個名詞、<span class="readout">{{ examMeta.exams.length }}</span> 科
          </dd>
        </div>
      </dl>
      <p class="colophon-note">{{ examMeta.disclaimer }}</p>
    </section>
    <div class="dashboard-grid">
      <section class="hero-card">
        <div class="hero-card__content">
          <p class="eyebrow">NEXT MISSION</p>
          <h2>第 {{ nextDay.day }} 天：{{ nextDay.title }}</h2>
          <p>{{ nextDay.reading }}</p>
          <div class="hero-card__actions">
            <button
              class="button button--primary"
              @click="navigate('plan', String(nextDay.day))"
            >
              繼續學習</button
            ><button class="button button--ghost" @click="navigate('quiz')">
              開始練習
            </button>
          </div>
        </div>
        <div class="progress-dial" :style="{ '--progress': `${completion}%` }">
          <div>
            <strong>{{ completion }}%</strong
            ><span>{{ completedCount }}／{{ studyDays.length }} 天</span>
          </div>
        </div>
      </section>
      <div class="stat-grid">
        <article class="stat-card">
          <span>已完成天數</span><strong>{{ completedCount }}</strong>
          <div class="meter">
            <span :style="{ width: `${completion}%` }"></span>
          </div>
          <small>共 {{ summary.studyDays }} 天</small>
        </article>
        <article class="stat-card">
          <span>作答次數</span><strong>{{ questionAttempts }}</strong
          ><small>題庫共 {{ summary.questions }} 題</small>
        </article>
        <article class="stat-card">
          <span>累積正確率</span><strong>{{ accuracy }}%</strong
          ><small>只計入已作答題目</small>
        </article>
        <article class="stat-card">
          <span>待複習錯題</span><strong>{{ wrongCount }}</strong
          ><small>從錯題簿重新練習</small>
        </article>
      </div>
      <section class="panel panel--span-2">
        <div class="panel__header">
          <div>
            <p class="eyebrow">EXAM MAP</p>
            <h2>雙科考綱</h2>
          </div>
          <span class="muted">最後核對：{{ examMeta.lastVerified }}</span>
        </div>
        <div class="exam-card-grid">
          <article
            v-for="exam in examMeta.exams"
            :key="exam.code"
            class="exam-card"
          >
            <div class="exam-card__title">
              <span class="exam-code">{{ exam.code }}</span
              ><strong>{{ exam.name }}</strong>
            </div>
            <p class="muted">
              新版技能清單生效：{{ exam.effectiveDate }}／作答時間：{{
                exam.durationMinutes
              }}
              分鐘／及格量尺分數：{{ exam.passingScore }}
            </p>
            <ul class="weight-list">
              <li v-for="skill in exam.skills" :key="skill.name">
                <span>{{ skill.name }}</span
                ><strong>{{ skill.weight }}</strong>
              </li>
            </ul>
            <div class="inline-actions">
              <a :href="exam.studyGuide" target="_blank" rel="noopener"
                >官方 Study Guide</a
              ><button @click="navigate('knowledge', exam.code.toLowerCase())">
                閱讀教材
              </button>
            </div>
          </article>
        </div>
      </section>
      <section class="panel">
        <div class="panel__header">
          <div>
            <p class="eyebrow">WEAK SPOTS</p>
            <h2>目前弱項</h2>
          </div>
          <button class="text-button" @click="navigate('quiz')">去練習</button>
        </div>
        <div v-if="weakDomains.length" class="weak-list">
          <div v-for="item in weakDomains" :key="item.name" class="weak-item">
            <div>
              <strong>{{ item.name }}</strong
              ><span>累積 {{ item.total }} 次作答</span>
            </div>
            <span
              class="score-pill"
              :data-level="
                item.score >= 85 ? 'good' : item.score >= 70 ? 'mid' : 'low'
              "
              >{{ item.score }}%</span
            >
          </div>
        </div>
        <div v-else class="empty-card">
          <strong>尚無作答資料</strong
          ><span>先做一輪 10 題練習，弱項才有東西可分析。</span>
        </div>
      </section>
      <section class="panel">
        <div class="panel__header">
          <div>
            <p class="eyebrow">COUNTDOWN</p>
            <h2>考試倒數</h2>
          </div>
          <button class="text-button" @click="navigate('settings')">
            設定日期
          </button>
        </div>
        <div class="countdown-list">
          <div
            v-for="exam in examMeta.exams"
            :key="exam.code"
            class="countdown-item"
          >
            <div>
              <strong>{{ exam.code }}</strong
              ><span>{{
                progress.examDates[exam.code] || "尚未設定考試日期"
              }}</span>
            </div>
            <span class="score-pill">{{
              countdown(progress.examDates[exam.code] || "")
            }}</span>
          </div>
        </div>
      </section>
      <section class="panel panel--span-2">
        <div class="panel__header">
          <div>
            <p class="eyebrow">RECENT</p>
            <h2>最近模擬紀錄</h2>
          </div>
          <button class="text-button" @click="navigate('quiz')">
            開啟題庫
          </button>
        </div>
        <div v-if="recentAttempts.length" class="attempt-list">
          <div
            v-for="item in recentAttempts"
            :key="item.id"
            class="attempt-item"
          >
            <div>
              <strong>{{ item.exam }}／{{ item.mode }}</strong
              ><span
                >{{ formatDateTime(item.date) }}・{{ item.correct }}／{{
                  item.total
                }}
                題</span
              >
            </div>
            <span
              class="score-pill"
              :data-level="
                item.score >= 85 ? 'good' : item.score >= 70 ? 'mid' : 'low'
              "
              >{{ item.score }}%</span
            >
          </div>
        </div>
        <div v-else class="empty-card">
          <strong>還沒有模擬紀錄</strong
          ><span
            >題庫有 {{ questions.length }} 題，名詞庫有
            {{ terms.length }} 個詞。數字已經備妥，輪到人類開始作答。</span
          >
        </div>
      </section>
    </div>
  </section>
</template>
