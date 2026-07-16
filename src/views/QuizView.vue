<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from "vue";
import { questions } from "../content";
import {
  addAttempt,
  clearWrongAnswers,
  progress,
  recordQuestion,
} from "../store";
import { route } from "../router";
import { makeId, optionText, percent, shuffled } from "../utils";
import { showToast } from "../toast";
import type { ExamCode, Question, QuestionOption, QuizAttempt } from "../types";
type Screen = "setup" | "quiz" | "result";
type ExamFilter = ExamCode | "混合";
interface DisplayQuestion {
  question: Question;
  options: QuestionOption[];
}
const screen = ref<Screen>("setup");
const exam = ref<ExamFilter>("AZ-900");
const domain = ref("全部");
const count = ref(10);
const mode = ref<"練習模式" | "模擬考模式">("練習模式");
const wrongOnly = ref(false);
const current = ref(0);
const session = ref<DisplayQuestion[]>([]);
const answers = ref<Record<string, string>>({});
const flagged = ref<string[]>([]);
const submitted = ref(false);
const remainingSeconds = ref(45 * 60);
const result = ref<QuizAttempt | null>(null);
let timer: number | undefined;
const domains = computed(() => [
  "全部",
  ...new Set(
    questions
      .filter((q) => exam.value === "混合" || q.exam === exam.value)
      .map((q) => q.domain),
  ),
]);
const available = computed(() =>
  questions.filter(
    (q) =>
      (exam.value === "混合" || q.exam === exam.value) &&
      (domain.value === "全部" || q.domain === domain.value) &&
      (!wrongOnly.value || progress.wrongQuestionIds.includes(q.id)),
  ),
);
const active = computed(() => session.value[current.value]);
const selected = computed(() =>
  active.value ? answers.value[active.value.question.id] : undefined,
);
const answeredCount = computed(() => Object.keys(answers.value).length);
const timerText = computed(
  () =>
    `${String(Math.floor(remainingSeconds.value / 60)).padStart(2, "0")}：${String(remainingSeconds.value % 60).padStart(2, "0")}`,
);
function stopTimer() {
  if (timer) {
    clearInterval(timer);
    timer = undefined;
  }
}
function startTimer() {
  stopTimer();
  remainingSeconds.value = 45 * 60;
  timer = window.setInterval(() => {
    remainingSeconds.value -= 1;
    if (remainingSeconds.value <= 0) {
      stopTimer();
      finish(true);
    }
  }, 1000);
}
function startQuiz(specific?: Question[]) {
  let pool = specific ?? available.value;
  if (!pool.length) {
    showToast(
      wrongOnly.value ? "目前沒有符合條件的錯題。" : "目前沒有符合條件的題目。",
      "warning",
    );
    return;
  }
  const picked =
    specific ?? shuffled(pool).slice(0, Math.min(count.value, pool.length));
  session.value = picked.map((q) => ({
    question: q,
    options: shuffled(q.options),
  }));
  answers.value = {};
  flagged.value = [];
  current.value = 0;
  submitted.value = false;
  result.value = null;
  screen.value = "quiz";
  if (mode.value === "模擬考模式") startTimer();
  else stopTimer();
  window.scrollTo({ top: 0, left: 0 });
}
function choose(id: string) {
  if (!active.value) return;
  if (mode.value === "練習模式" && answers.value[active.value.question.id])
    return;
  answers.value = { ...answers.value, [active.value.question.id]: id };
}
function toggleFlag() {
  const id = active.value.question.id;
  flagged.value = flagged.value.includes(id)
    ? flagged.value.filter((x) => x !== id)
    : [...flagged.value, id];
}
function jump(index: number) {
  current.value = index;
  window.scrollTo({ top: 0, left: 0, behavior: "smooth" });
}
function next() {
  if (current.value < session.value.length - 1) jump(current.value + 1);
}
function previous() {
  if (current.value > 0) jump(current.value - 1);
}
function finish(force = false) {
  if (submitted.value) return;
  const unanswered = session.value.length - answeredCount.value;
  if (
    unanswered &&
    !force &&
    !window.confirm(`尚有 ${unanswered} 題未作答，仍要交卷嗎？`)
  )
    return;
  stopTimer();
  let correct = 0;
  const domainStats: Record<string, { correct: number; total: number }> = {};
  for (const item of session.value) {
    const q = item.question;
    const ok = answers.value[q.id] === q.answer;
    if (ok) correct += 1;
    const d = domainStats[q.domain] ?? { correct: 0, total: 0 };
    d.total += 1;
    if (ok) d.correct += 1;
    domainStats[q.domain] = d;
    recordQuestion(q.id, ok);
  }
  const attempt: QuizAttempt = {
    id: makeId("attempt"),
    exam: exam.value,
    mode: mode.value,
    date: new Date().toISOString(),
    correct,
    total: session.value.length,
    score: percent(correct, session.value.length),
    domains: domainStats,
  };
  addAttempt(attempt);
  result.value = attempt;
  submitted.value = true;
  screen.value = "result";
  window.scrollTo({ top: 0, left: 0 });
}
function reset() {
  stopTimer();
  screen.value = "setup";
  session.value = [];
  answers.value = {};
  result.value = null;
}
function specificFromRoute() {
  const q = questions.find((x) => x.id === route.param);
  if (q) {
    exam.value = q.exam;
    mode.value = "練習模式";
    startQuiz([q]);
  }
}
watch(() => route.param, specificFromRoute, { immediate: true });
watch(exam, () => {
  domain.value = "全部";
});
onBeforeUnmount(stopTimer);
</script>
<template>
  <section class="page-stack">
    <div class="page-intro">
      <div>
        <span class="badge badge--accent">50 題原創情境題</span>
        <h2>模擬題</h2>
        <p>
          可依考科、技能領域與錯題篩選。練習模式立即解析，模擬考模式在交卷後統一檢討，因為考場不會在每題後替你拍拍肩。
        </p>
      </div>
      <div class="compact-progress">
        <strong>{{ progress.wrongQuestionIds.length }}</strong
        ><span>待複習錯題</span
        ><button
          v-if="progress.wrongQuestionIds.length"
          class="text-button"
          @click="
            clearWrongAnswers();
            showToast('錯題紀錄已清除。', 'success');
          "
        >
          清除紀錄
        </button>
      </div>
    </div>
    <div v-if="screen === 'setup'" class="quiz-setup-grid">
      <section class="panel quiz-setup-card">
        <div class="panel__header">
          <div>
            <p class="eyebrow">SETUP</p>
            <h2>建立一輪練習</h2>
          </div>
          <span class="badge">可用 {{ available.length }} 題</span>
        </div>
        <label
          >考科<select v-model="exam">
            <option>AZ-900</option>
            <option>SC-900</option>
            <option>混合</option>
          </select></label
        ><label
          >技能領域<select v-model="domain">
            <option v-for="item in domains" :key="item">{{ item }}</option>
          </select></label
        ><label
          >題數<select v-model.number="count">
            <option :value="10">10 題</option>
            <option :value="25">25 題</option>
            <option :value="50">50 題</option>
          </select></label
        >
        <div>
          <span class="detail-label">作答模式</span>
          <div class="mode-options">
            <label
              ><input v-model="mode" type="radio" value="練習模式" /><span
                ><strong>練習模式</strong
                ><small>選答後立即顯示解析</small></span
              ></label
            ><label
              ><input v-model="mode" type="radio" value="模擬考模式" /><span
                ><strong>模擬考模式</strong
                ><small>45 分鐘，交卷後解析</small></span
              ></label
            >
          </div>
        </div>
        <label class="toggle-control"
          ><input v-model="wrongOnly" type="checkbox" />只練目前錯題</label
        ><button
          class="button button--primary button--full"
          :disabled="!available.length"
          @click="startQuiz()"
        >
          開始 {{ Math.min(count, available.length) }} 題
        </button>
      </section>
      <section class="panel">
        <div class="panel__header">
          <div>
            <p class="eyebrow">STRATEGY</p>
            <h2>答題策略</h2>
          </div>
        </div>
        <ol class="memory-list">
          <li>先抓題幹動詞：描述、選擇、阻擋、偵測、保留或授權。</li>
          <li>先判斷責任層級與服務範圍，再看產品名稱。</li>
          <li>選「最直接符合需求」的答案，不替題目追加未寫出的架構。</li>
          <li>不確定時先標記，避免一題耗盡後面五題的時間。</li>
          <li>解析時一定讀錯誤選項，否則只是在背正確字母。</li>
        </ol>
        <div class="notice">
          官方及格門檻是量尺分數
          700，不能直接換算為固定答對比例。本教材以連續兩次約
          85% 作為較保守的備考門檻。
        </div>
      </section>
    </div>
    <template v-else-if="screen === 'quiz' && active"
      ><div class="quiz-toolbar">
        <div>
          <strong>{{ mode }}</strong
          ><span>{{ active.question.exam }}／{{ active.question.domain }}</span>
        </div>
        <div class="quiz-toolbar__right">
          <span
            v-if="mode === '模擬考模式'"
            class="timer"
            :class="{ 'timer--warning': remainingSeconds < 300 }"
            >{{ timerText }}</span
          ><span>{{ answeredCount }}／{{ session.length }} 已作答</span
          ><button class="button button--primary" @click="finish()">
            交卷
          </button>
        </div>
      </div>
      <div class="quiz-layout">
        <article class="panel quiz-card">
          <div class="quiz-card__meta">
            <span class="badge"
              >第 {{ current + 1 }}／{{ session.length }} 題</span
            ><button
              class="flag-button"
              :class="{ active: flagged.includes(active.question.id) }"
              @click="toggleFlag"
            >
              {{
                flagged.includes(active.question.id) ? "已標記" : "標記稍後檢查"
              }}
            </button>
          </div>
          <h2>{{ active.question.question }}</h2>
          <div class="option-list">
            <button
              v-for="(option, index) in active.options"
              :key="option.id"
              :class="{
                selected: selected === option.id,
                correct:
                  mode === '練習模式' &&
                  selected &&
                  option.id === active.question.answer,
                wrong:
                  mode === '練習模式' &&
                  selected === option.id &&
                  option.id !== active.question.answer,
              }"
              @click="choose(option.id)"
            >
              <span class="option-key">{{
                ["1", "2", "3", "4"][index]
              }}</span
              ><span>{{ option.text }}</span>
            </button>
          </div>
          <div
            v-if="mode === '練習模式' && selected"
            class="answer-feedback"
            :data-correct="selected === active.question.answer"
          >
            <strong>{{
              selected === active.question.answer ? "答對了" : "答案不符"
            }}</strong>
            <p>
              <b>正確答案：</b
              >{{ optionText(active.question.options, active.question.answer) }}
            </p>
            <p>{{ active.question.explanation }}</p>
            <p><b>常見陷阱：</b>{{ active.question.trap }}</p>
          </div>
          <footer class="quiz-card__footer">
            <button
              class="button button--ghost"
              :disabled="current === 0"
              @click="previous"
            >
              上一題</button
            ><button
              v-if="current < session.length - 1"
              class="button button--primary"
              @click="next"
            >
              下一題</button
            ><button v-else class="button button--primary" @click="finish()">
              完成並交卷
            </button>
          </footer>
        </article>
        <aside class="panel question-map">
          <header>
            <strong>題目導覽</strong
            ><span>{{ answeredCount }}/{{ session.length }}</span>
          </header>
          <div>
            <button
              v-for="(item, index) in session"
              :key="item.question.id"
              :class="{
                active: index === current,
                answered: answers[item.question.id],
                flagged: flagged.includes(item.question.id),
              }"
              :aria-label="`前往第 ${index + 1} 題`"
              @click="jump(index)"
            >
              {{ index + 1 }}
            </button>
          </div>
          <small>實心框代表已作答；右上點代表已標記。</small>
        </aside>
      </div></template
    >
    <template v-else-if="screen === 'result' && result"
      ><section
        class="panel result-hero"
        :data-level="
          result.score >= 85 ? 'good' : result.score >= 70 ? 'mid' : 'low'
        "
      >
        <div>
          <p class="eyebrow">RESULT</p>
          <h2>{{ result.score }}%</h2>
          <p>
            {{ result.correct }}／{{ result.total }} 題正確。{{
              result.score >= 85
                ? "已達本教材建議門檻，仍應檢查錯題理由。"
                : result.score >= 70
                  ? "接近門檻，優先補最弱領域。"
                  : "先回到觀念與名詞，不要用重刷題目掩蓋缺口。"
            }}
          </p>
        </div>
        <div class="result-actions">
          <button class="button button--ghost" @click="reset">調整條件</button
          ><button class="button button--primary" @click="startQuiz()">
            再做一輪
          </button>
        </div>
      </section>
      <div class="result-grid">
        <section class="panel">
          <div class="panel__header"><h2>領域表現</h2></div>
          <div class="domain-result-list">
            <div v-for="(stat, name) in result.domains" :key="name">
              <div>
                <strong>{{ name }}</strong
                ><span
                  >{{ stat.correct }}／{{ stat.total }}（{{
                    percent(stat.correct, stat.total)
                  }}%）</span
                >
              </div>
              <div class="meter">
                <span
                  :style="{ width: `${percent(stat.correct, stat.total)}%` }"
                ></span>
              </div>
            </div>
          </div>
        </section>
        <section class="panel">
          <div class="panel__header"><h2>本輪摘要</h2></div>
          <div class="cheat-grid">
            <div class="cheat-item">
              <strong>{{ result.total - result.correct }}</strong
              ><span>答錯</span>
            </div>
            <div class="cheat-item">
              <strong>{{ session.length - answeredCount }}</strong
              ><span>未作答</span>
            </div>
            <div class="cheat-item">
              <strong>{{ flagged.length }}</strong
              ><span>曾標記</span>
            </div>
            <div class="cheat-item">
              <strong>{{ mode }}</strong
              ><span>作答模式</span>
            </div>
          </div>
        </section>
      </div>
      <div class="review-list">
        <article
          v-for="(item, index) in session"
          :key="item.question.id"
          class="panel review-card"
          :data-correct="answers[item.question.id] === item.question.answer"
        >
          <header>
            <span class="badge"
              >{{ item.question.exam }} 第 {{ index + 1 }} 題</span
            ><strong>{{
              answers[item.question.id] === item.question.answer
                ? "正確"
                : "需複習"
            }}</strong>
          </header>
          <h3>{{ item.question.question }}</h3>
          <p>
            <b>你的答案：</b
            >{{ optionText(item.question.options, answers[item.question.id]) }}
          </p>
          <p>
            <b>正確答案：</b
            >{{ optionText(item.question.options, item.question.answer) }}
          </p>
          <div class="answer-explanation">
            <strong>解析</strong>
            <p>{{ item.question.explanation }}</p>
          </div>
          <div class="trap-note">
            <strong>陷阱</strong>
            <p>{{ item.question.trap }}</p>
          </div>
        </article>
      </div></template
    >
  </section>
</template>
