<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from "vue";
import { caseStudyById, examMeta, questions } from "../content";
import {
  addAttempt,
  clearLuckyQuestions,
  clearWrongAnswers,
  progress,
  recordQuestion,
} from "../store";
import { route } from "../router";
import {
  answerText,
  isComplete,
  isQuestionCorrect,
  questionOptions,
} from "../quiz";
import {
  availableQuestions,
  buildSession,
  type ExamFilter,
  type PoolSource,
} from "../question-pool";
import { makeId, percent, shuffled } from "../utils";
import { showToast } from "../toast";
import QuestionCard from "../components/QuestionCard.vue";
import AnswerFeedback from "../components/AnswerFeedback.vue";
import CaseScenarioPanel from "../components/CaseScenarioPanel.vue";
import type {
  Confidence,
  Question,
  QuestionAnswer,
  QuestionOption,
  QuizAttempt,
} from "../types";

type Screen = "setup" | "quiz" | "result";
interface DisplayQuestion {
  question: Question;
  options: QuestionOption[];
}

const screen = ref<Screen>("setup");
const exam = ref<ExamFilter>("AZ-900");
const domain = ref("全部");
const count = ref(10);
const mode = ref<"練習模式" | "模擬考模式">("練習模式");
const source = ref<PoolSource>("all");
const confidenceEnabled = ref(true);
const current = ref(0);
const session = ref<DisplayQuestion[]>([]);
const answers = ref<Record<string, QuestionAnswer>>({});
const confidence = ref<Record<string, Confidence>>({});
const flagged = ref<string[]>([]);
const revealed = ref<string[]>([]);
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
  availableQuestions({
    questions,
    exam: exam.value,
    domain: domain.value,
    source: source.value,
    wrongIds: progress.wrongQuestionIds,
    luckyIds: progress.luckyQuestionIds,
  }),
);
const countOptions = computed(() =>
  available.value.length
    ? [...new Set([10, 25, 40, 50, available.value.length])]
        .filter((value) => value > 0 && value <= available.value.length)
        .sort((a, b) => a - b)
    : [0],
);
const active = computed(() => session.value[current.value]);
const selected = computed(() =>
  active.value ? answers.value[active.value.question.id] : undefined,
);
const activeCase = computed(() => {
  const id = active.value?.question.caseId;
  return id ? caseStudyById.get(id) : undefined;
});
const answeredCount = computed(
  () =>
    session.value.filter((item) =>
      isComplete(item.question, answers.value[item.question.id]),
    ).length,
);
const timerText = computed(
  () =>
    `${String(Math.floor(remainingSeconds.value / 60)).padStart(2, "0")}：${String(remainingSeconds.value % 60).padStart(2, "0")}`,
);
const activeRevealed = computed(() =>
  active.value ? revealed.value.includes(active.value.question.id) : false,
);
/** 練習模式下已填完但還沒揭曉的題，需要一個明確的確認動作。 */
const awaitingConfirm = computed(
  () =>
    mode.value === "練習模式" &&
    !!active.value &&
    !activeRevealed.value &&
    isComplete(active.value.question, selected.value),
);
const luckyInSession = computed(() =>
  session.value.filter(
    (item) =>
      confidence.value[item.question.id] === "unsure" &&
      isQuestionCorrect(item.question, answers.value[item.question.id]),
  ),
);

/**
 * 本輪的考綱刻度：每一段的寬度是該領域在本輪佔的題數比例，
 * 填滿的部分是已作答進度。刻線落在真實的領域分界上。
 */
const blueprint = computed(() => {
  const total = session.value.length;
  if (!total) return [];
  const groups = new Map<string, { total: number; done: number }>();
  for (const item of session.value) {
    const entry = groups.get(item.question.domain) ?? { total: 0, done: 0 };
    entry.total += 1;
    if (isComplete(item.question, answers.value[item.question.id]))
      entry.done += 1;
    groups.set(item.question.domain, entry);
  }
  return [...groups].map(([domain, entry]) => ({
    domain,
    width: (entry.total / total) * 100,
    fill: percent(entry.done, entry.total),
    done: entry.done,
    total: entry.total,
  }));
});

/** 結果頁的門檻尺：量尺是 0～1000 的量尺分數，紅線刻在及格的 700。 */
const scaled = computed(() =>
  result.value ? Math.round((result.value.score / 100) * 1000) : 0,
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

function present(picked: Question[]) {
  session.value = picked.map((q) => ({
    question: q,
    options:
      q.type === "true-false"
        ? questionOptions(q)
        : shuffled(questionOptions(q)),
  }));
  answers.value = {};
  confidence.value = {};
  flagged.value = [];
  revealed.value = [];
  current.value = 0;
  submitted.value = false;
  result.value = null;
  screen.value = "quiz";
  if (mode.value === "模擬考模式") startTimer();
  else stopTimer();
  window.scrollTo({ top: 0, left: 0 });
}

function startQuiz(specific?: Question[]) {
  if (specific) {
    present(specific);
    return;
  }
  const picked = buildSession({
    questions,
    examMeta: examMeta.exams,
    exam: exam.value,
    domain: domain.value,
    count: count.value,
    source: source.value,
    stats: progress.questionStats,
    wrongIds: progress.wrongQuestionIds,
    luckyIds: progress.luckyQuestionIds,
  });
  if (!picked.length) {
    showToast(
      source.value === "all"
        ? "目前沒有符合條件的題目。"
        : "目前沒有符合條件的複習題。",
      "warning",
    );
    return;
  }
  present(picked);
}

function setAnswer(value: QuestionAnswer) {
  if (!active.value) return;
  const question = active.value.question;
  answers.value = { ...answers.value, [question.id]: value };
  // 信心度關閉時，單選與是非沿用原本「選了就看解析」的一步流程。
  if (
    mode.value === "練習模式" &&
    !confidenceEnabled.value &&
    (question.type === "single" || question.type === "true-false")
  ) {
    reveal(question.id);
  }
}

function reveal(id: string) {
  if (!revealed.value.includes(id)) revealed.value.push(id);
}

function answerWithConfidence(level: Confidence) {
  if (!active.value) return;
  const id = active.value.question.id;
  confidence.value = { ...confidence.value, [id]: level };
  if (mode.value === "練習模式") reveal(id);
}

function confirmAnswer() {
  if (!active.value) return;
  reveal(active.value.question.id);
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
    const ok = isQuestionCorrect(q, answers.value[q.id]);
    if (ok) correct += 1;
    const d = domainStats[q.domain] ?? { correct: 0, total: 0 };
    d.total += 1;
    if (ok) d.correct += 1;
    domainStats[q.domain] = d;
    recordQuestion(q.id, ok, confidence.value[q.id]);
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
  confidence.value = {};
  revealed.value = [];
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
watch(mode, (value) => {
  if (value === "模擬考模式" && countOptions.value.includes(40))
    count.value = 40;
});
watch(
  countOptions,
  (options) => {
    if (!options.includes(count.value)) count.value = options.at(-1) ?? 10;
  },
  { immediate: true },
);
onBeforeUnmount(stopTimer);
</script>

<template>
  <section class="page-stack">
    <div class="page-intro">
      <div>
        <span class="badge badge--accent"
          >{{ questions.length }} 題原創情境題</span
        >
        <h2>模擬題</h2>
        <p>
          可依考科、技能領域與複習狀態篩選。未指定領域時依官方考綱權重配題，同一個觀念一輪只出一題。練習模式立即解析，模擬考模式在交卷後統一檢討，因為考場不會在每題後替你拍拍肩。
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
          >題目來源<select v-model="source">
            <option value="all">全部題目</option>
            <option value="wrong">只練錯題</option>
            <option value="wrong-and-lucky">錯題＋幸運答對</option>
          </select></label
        ><label
          >題數<select v-model.number="count" :disabled="!available.length">
            <option
              v-for="option in countOptions"
              :key="option"
              :value="option"
            >
              {{
                option === 0
                  ? "無可用題目"
                  : option === available.length
                    ? `全部（${option} 題）`
                    : `${option} 題`
              }}
            </option>
          </select></label
        >
        <div>
          <span class="detail-label">作答模式</span>
          <div class="mode-options">
            <label
              ><input v-model="mode" type="radio" value="練習模式" /><span
                ><strong>練習模式</strong
                ><small>作答後立即顯示逐項解析</small></span
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
          ><input v-model="confidenceEnabled" type="checkbox" />作答時自評把握度
        </label>
        <p class="muted">
          自評「不確定」卻答對的題會列為幸運答對，仍會回到複習清單。分數不該替猜對的題背書。
        </p>
        <button
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
          <li>解析時一定讀錯誤選項的理由，否則只是在背正確字母。</li>
        </ol>
        <div class="notice">
          官方及格門檻是量尺分數
          700，不能直接換算為固定答對比例。本教材以連續兩次約 85%
          作為較保守的備考門檻。
        </div>
        <div v-if="progress.luckyQuestionIds.length" class="notice">
          目前有 {{ progress.luckyQuestionIds.length }}
          題屬於幸運答對。
          <button
            class="text-button"
            @click="
              clearLuckyQuestions();
              showToast('幸運答對紀錄已清除。', 'success');
            "
          >
            清除紀錄
          </button>
        </div>
      </section>
    </div>

    <template v-else-if="screen === 'quiz' && active"
      ><div class="quiz-toolbar">
        <div>
          <strong>{{ mode }}</strong
          ><span class="readout">{{ active.question.exam }}</span
          ><span>{{ active.question.domain }}</span>
        </div>
        <div class="quiz-toolbar__right">
          <span
            v-if="mode === '模擬考模式'"
            class="timer"
            :class="{ 'timer--warning': remainingSeconds < 300 }"
            >{{ timerText }}</span
          ><span class="readout">{{ answeredCount }}／{{ session.length }}</span
          ><button class="button button--primary" @click="finish()">
            交卷
          </button>
        </div>
      </div>
      <div class="scale quiz-blueprint">
        <div class="scale__track">
          <div
            v-for="band in blueprint"
            :key="band.domain"
            class="scale__band"
            :style="{ width: `${band.width}%` }"
            :title="`${band.domain}：${band.done}／${band.total} 已作答`"
          >
            <span :style="{ width: `${band.fill}%` }"></span>
          </div>
        </div>
        <div class="scale__legend">
          <span v-for="band in blueprint" :key="band.domain">
            <b>{{ band.domain }}</b
            ><span class="readout">{{ band.done }}/{{ band.total }}</span>
          </span>
        </div>
      </div>
      <div class="quiz-layout">
        <article class="panel quiz-card">
          <CaseScenarioPanel
            v-if="activeCase"
            :key="activeCase.id"
            :case-study="activeCase"
          />
          <div class="quiz-card__meta">
            <span class="badge"
              >第 {{ current + 1 }}／{{ session.length }} 題</span
            ><span class="badge">{{ active.question.difficulty }}</span
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
          <QuestionCard
            :question="active.question"
            :options="active.options"
            :answer="selected"
            :revealed="mode === '練習模式' && activeRevealed"
            @answer="setAnswer"
          />

          <div
            v-if="
              confidenceEnabled &&
              !activeRevealed &&
              isComplete(active.question, selected)
            "
            class="confidence-row"
          >
            <span class="detail-label">送出前先自評</span>
            <div>
              <button
                class="button button--ghost"
                :class="{ active: confidence[active.question.id] === 'sure' }"
                @click="answerWithConfidence('sure')"
              >
                有把握
              </button>
              <button
                class="button button--ghost"
                :class="{ active: confidence[active.question.id] === 'unsure' }"
                @click="answerWithConfidence('unsure')"
              >
                不確定
              </button>
            </div>
          </div>
          <button
            v-else-if="awaitingConfirm"
            class="button button--primary"
            @click="confirmAnswer"
          >
            確認作答並看解析
          </button>

          <div
            v-if="mode === '練習模式' && activeRevealed"
            class="answer-feedback"
            :data-correct="isQuestionCorrect(active.question, selected)"
          >
            <strong role="status">{{
              isQuestionCorrect(active.question, selected)
                ? confidence[active.question.id] === "unsure"
                  ? "答對了，但你自評不確定"
                  : "答對了"
                : "答案不符"
            }}</strong>
            <p><b>你的答案：</b>{{ answerText(active.question, selected) }}</p>
            <AnswerFeedback :question="active.question" :answer="selected" />
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
                answered: isComplete(item.question, answers[item.question.id]),
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
        <div class="result-readout">
          <p class="eyebrow">Scaled score</p>
          <strong class="readout readout--xl">{{ scaled }}</strong>
          <div class="scale scale--threshold">
            <div class="scale__track">
              <div class="scale__band" :style="{ width: `${result.score}%` }">
                <span style="width: 100%"></span>
              </div>
              <i class="scale__mark" data-label="700"></i>
            </div>
          </div>
          <p>
            {{ result.correct }}／{{ result.total }} 題正確（{{
              result.score
            }}%）。{{
              result.score >= 85
                ? "已達本教材建議門檻，仍應檢查錯題理由。"
                : result.score >= 70
                  ? "接近門檻，優先補最弱領域。"
                  : "先回到觀念與名詞，不要用重刷題目掩蓋缺口。"
            }}
          </p>
          <p class="muted">
            量尺分數為本站依答對比例換算，官方 700
            採用的量尺不公開，不能直接對照。
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
              <strong>{{ luckyInSession.length }}</strong
              ><span>幸運答對</span>
            </div>
            <div class="cheat-item">
              <strong>{{ flagged.length }}</strong
              ><span>曾標記</span>
            </div>
          </div>
          <div v-if="luckyInSession.length" class="notice">
            以下題目答對了，但你自評不確定。分數看不出這個缺口，它們已回到複習清單：
            <ul class="lucky-list">
              <li v-for="item in luckyInSession" :key="item.question.id">
                {{ item.question.question }}
              </li>
            </ul>
          </div>
        </section>
      </div>
      <div class="review-list">
        <article
          v-for="(item, index) in session"
          :key="item.question.id"
          class="panel review-card"
          :data-correct="
            isQuestionCorrect(item.question, answers[item.question.id])
          "
        >
          <header>
            <span class="badge"
              >{{ item.question.exam }} 第 {{ index + 1 }} 題</span
            ><strong>{{
              isQuestionCorrect(item.question, answers[item.question.id])
                ? confidence[item.question.id] === "unsure"
                  ? "幸運答對"
                  : "正確"
                : "需複習"
            }}</strong>
          </header>
          <h3>{{ item.question.question }}</h3>
          <p>
            <b>你的答案：</b
            >{{ answerText(item.question, answers[item.question.id]) }}
          </p>
          <AnswerFeedback
            :question="item.question"
            :answer="answers[item.question.id]"
          />
        </article></div
    ></template>
  </section>
</template>
