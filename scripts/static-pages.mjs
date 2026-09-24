// Read-only HTML pages for crawlers and answer engines. The interactive app
// lives at "/" and routes by hash, which crawlers treat as one empty page, so
// every content unit also gets a JavaScript-free page at its own path, plus
// sitemap.xml, llms.txt and llms-full.txt. The app itself is untouched.
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { Marked } from "marked";

export const SITE_URL = "https://az-sc900-study-guide.t11306458.workers.dev";
export const SITE_NAME = "AZ-900 × SC-900 認證參考書";

const root = fileURLToPath(new URL("..", import.meta.url));

export function loadContent(dir = root) {
  const json = (name) =>
    JSON.parse(readFileSync(join(dir, "data", name), "utf8"));
  const md = (name) =>
    readFileSync(join(dir, "content/chapters", `${name}.md`), "utf8");
  // Same order and ids as src/content.ts.
  const chapters = [
    { id: "start-here", title: "開始使用", raw: md("start-here") },
    { id: "az-900", title: "AZ-900 必備知識", raw: md("az-900") },
    { id: "sc-900", title: "SC-900 必備知識", raw: md("sc-900") },
    { id: "cross-exam", title: "雙科比較與易混淆辨析", raw: md("cross-exam") },
  ];
  return {
    meta: json("exam-meta.json"),
    chapters,
    questions: json("questions.json"),
    cases: json("case-studies.json"),
    glossary: json("glossary.json"),
    faqs: json("faq.json"),
    qas: json("qa.json"),
    review: json("review.json"),
    plan: json("study-plan.json"),
    sources: json("sources.json"),
  };
}

const escapeHtml = (text) =>
  String(text).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
// JSON-LD sits in a <script> block; "<" must not be able to close it.
const jsonLd = (data) =>
  `<script type="application/ld+json">${JSON.stringify(data).replace(/</g, "\\u003c")}</script>`;

function plainIntro(raw) {
  const paragraph = new Marked()
    .lexer(raw)
    .find((token) => token.type === "paragraph");
  const text = (paragraph?.text ?? "")
    .replace(/[*`_[\]\\]/g, "")
    .replace(/\(https?:[^)]*\)/g, "");
  return text.length > 110 ? `${text.slice(0, 110)}…` : text;
}

const optionText = (options, id) =>
  options.find((option) => option.id === id).text;
const yesNo = (value) => (value ? "是" : "否");

// The correct answer written out as text: the app shuffles options, so a
// letter an answer engine quotes would point at nothing.
export function answerText(question) {
  switch (question.type) {
    case "true-false":
      return question.answer ? "正確" : "錯誤";
    case "single":
      return optionText(question.options, question.answer);
    case "multiple":
      return question.answer
        .map((id) => optionText(question.options, id))
        .join("；");
    case "yes-no-matrix":
      return question.statements
        .map((s) => `「${s.text}」${yesNo(s.answer)}`)
        .join("；");
    case "dropdown":
      return question.segments
        .map((s) => `${s.label}：${optionText(s.options, s.answer)}`)
        .join("；");
  }
  throw new Error(`未知題型 ${question.type}`);
}

// Question text as a reader sees it; dropdown blanks become ＿＿＿.
function stem(question) {
  return question.type === "dropdown"
    ? question.template.replace(/\{[^}]+\}/g, "＿＿＿")
    : question.question;
}

const pageUrl = (path) => `${SITE_URL}${path}`;
const slug = (text) => text.toLowerCase();

function layout(site, page) {
  const nav = site.nav
    .map(
      (item) =>
        `<li><a href="${item.path}"${item.path === page.path ? ' aria-current="page"' : ""}>${escapeHtml(item.label)}</a></li>`,
    )
    .join("");
  return `<!doctype html>
<html lang="zh-Hant-TW">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(page.title)} | ${SITE_NAME}</title>
<meta name="description" content="${escapeHtml(page.description)}">
<link rel="canonical" href="${pageUrl(page.path)}">
<meta property="og:type" content="article">
<meta property="og:site_name" content="${SITE_NAME}">
<meta property="og:title" content="${escapeHtml(page.title)}">
<meta property="og:description" content="${escapeHtml(page.description)}">
<meta property="og:url" content="${pageUrl(page.path)}">
<meta name="twitter:card" content="summary">
<link rel="icon" href="/icon.svg" type="image/svg+xml">
<link rel="stylesheet" href="/static.css">
${jsonLd({ "@context": "https://schema.org", ...page.schema, url: pageUrl(page.path), inLanguage: "zh-Hant-TW" })}
</head>
<body>
<a class="skip" href="#main">跳到主要內容</a>
<header class="top">
<a class="brand" href="/">${SITE_NAME}</a>
<a class="open-app" href="/#/${page.app}">開啟互動版</a>
</header>
<div class="shell">
<nav aria-label="教材目錄"><ul>${nav}</ul></nav>
<main id="main">
<h1>${escapeHtml(page.title)}</h1>
${page.body}
</main>
</div>
<footer><p>${escapeHtml(site.disclaimer)}</p><p>內容最後核對：${escapeHtml(site.lastVerified)}</p></footer>
</body>
</html>
`;
}

function chapterPage(chapter) {
  const description = plainIntro(chapter.raw);
  // The chapter's own H1 duplicates the page title.
  const body = new Marked().parse(chapter.raw.replace(/^# .*\n+/, ""));
  return {
    path: `/knowledge/${chapter.id}/`,
    label: chapter.title,
    title: chapter.title,
    description,
    app: `knowledge/${chapter.id}`,
    group: "教材",
    body,
    schema: {
      "@type": "LearningResource",
      name: chapter.title,
      description,
      learningResourceType: "教材",
      isPartOf: { "@type": "Course", name: SITE_NAME, url: `${SITE_URL}/` },
    },
  };
}

function choicesHtml(question) {
  switch (question.type) {
    case "true-false":
      return "<p>是非題：判斷敘述是否正確。</p>";
    case "single":
    case "multiple":
      return `<p>${question.type === "multiple" ? "複選題" : "單選題"}，選項：</p><ul>${question.options.map((o) => `<li>${escapeHtml(o.text)}</li>`).join("")}</ul>`;
    case "yes-no-matrix":
      return `<p>逐項判斷下列陳述是否正確：</p><ul>${question.statements.map((s) => `<li>${escapeHtml(s.text)}</li>`).join("")}</ul>`;
    case "dropdown":
      return `<p>為每個空格選出正確選項：</p><ul>${question.segments.map((s) => `<li>${escapeHtml(s.label)}：${s.options.map((o) => escapeHtml(o.text)).join("／")}</li>`).join("")}</ul>`;
  }
}

function rationalesHtml(question) {
  if (question.type === "yes-no-matrix")
    return `<ul>${question.statements.map((s) => `<li>${escapeHtml(s.text)}：<strong>${yesNo(s.answer)}</strong>。${escapeHtml(s.rationale)}</li>`).join("")}</ul>`;
  if (question.type === "dropdown")
    return `<ul>${question.segments.map((s) => `<li>${escapeHtml(s.label)}：<strong>${escapeHtml(optionText(s.options, s.answer))}</strong>。${escapeHtml(s.rationale)}</li>`).join("")}</ul>`;
  const entries =
    question.type === "true-false"
      ? [
          ["正確", question.optionRationales.true],
          ["錯誤", question.optionRationales.false],
        ]
      : question.options.map((o) => [o.text, question.optionRationales[o.id]]);
  return `<ul>${entries
    .filter(([, why]) => why)
    .map(([label, why]) => `<li>${escapeHtml(label)}：${escapeHtml(why)}</li>`)
    .join("")}</ul>`;
}

function questionHtml(question, sources) {
  const cited = question.sourceIds
    .map((id) => sources.find((source) => source.id === id))
    .filter(Boolean)
    .map(
      (source) =>
        `<a href="${escapeHtml(source.url)}" rel="noopener">${escapeHtml(source.title)}</a>`,
    )
    .join("、");
  return `<article class="question" id="${slug(question.id)}">
<h2>${escapeHtml(question.exam)} 第 ${question.number} 題（${escapeHtml(question.difficulty)}）</h2>
<p class="stem">${escapeHtml(stem(question))}</p>
${choicesHtml(question)}
<details><summary>看答案與解析</summary>
<p><strong>正確答案：</strong>${escapeHtml(answerText(question))}</p>
<p><strong>解析：</strong>${escapeHtml(question.explanation)}</p>
${rationalesHtml(question)}
<p><strong>常見陷阱：</strong>${escapeHtml(question.trap)}</p>
${cited ? `<p><strong>依據：</strong>${cited}</p>` : ""}
</details>
<p><a href="/#/quiz/${encodeURIComponent(question.id)}">在互動版作答這題</a></p>
</article>`;
}

function caseHtml(item) {
  return `<section class="case" id="${slug(item.id)}">
<h2>情境題組：${escapeHtml(item.title)}</h2>
<p>${escapeHtml(item.scenario)}</p>
${item.requirements.length ? `<ul>${item.requirements.map((r) => `<li>${escapeHtml(r)}</li>`).join("")}</ul>` : ""}
</section>`;
}

function quizPages(content) {
  // Domains in the order they first appear in the bank, per exam.
  const groups = [];
  for (const q of content.questions) {
    let group = groups.find((g) => g.exam === q.exam && g.domain === q.domain);
    if (!group) {
      const index = groups.filter((g) => g.exam === q.exam).length + 1;
      group = { exam: q.exam, domain: q.domain, index, items: [] };
      groups.push(group);
    }
    group.items.push(q);
  }
  const caseById = new Map(content.cases.map((item) => [item.id, item]));
  const pages = groups.map((group) => {
    const title = `${group.exam} 模擬題：${group.domain}`;
    const description = `${group.exam}「${group.domain}」${group.items.length} 題原創模擬題，附正確答案、逐項解析與常見陷阱。`;
    const shown = new Set();
    const body = group.items
      .map((q) => {
        const lead =
          q.caseId && !shown.has(q.caseId) && caseById.has(q.caseId)
            ? caseHtml(caseById.get(q.caseId))
            : "";
        if (q.caseId) shown.add(q.caseId);
        return lead + questionHtml(q, content.sources);
      })
      .join("\n");
    return {
      path: `/quiz/${slug(group.exam)}-${group.index}/`,
      label: `${group.exam} ${group.domain}`,
      title,
      description,
      app: "quiz",
      group: "模擬題",
      body: `<p>${escapeHtml(description)}選項順序在互動版會隨機排列。</p>\n${body}`,
      schema: {
        "@type": "Quiz",
        name: title,
        about: group.exam,
        hasPart: group.items.map((q) => ({
          "@type": "Question",
          name: stem(q),
          acceptedAnswer: {
            "@type": "Answer",
            text: `${answerText(q)}。${q.explanation}`,
          },
        })),
      },
    };
  });
  const index = {
    path: "/quiz/",
    label: "模擬題總覽",
    title: "AZ-900 與 SC-900 模擬題",
    description: `依考科與領域分組的 ${content.questions.length} 題原創模擬題，含是非矩陣、下拉填空與情境題組，每題附正確答案與解析。`,
    app: "quiz",
    group: "模擬題",
    body: `<p>依考科與領域分組的 ${content.questions.length} 題原創模擬題。題目為學習用途自行撰寫，不是實際考題。</p><ul>${pages
      .map(
        (page, i) =>
          `<li><a href="${page.path}">${escapeHtml(page.title)}</a>（${groups[i].items.length} 題）</li>`,
      )
      .join("")}</ul>`,
    schema: { "@type": "CollectionPage", name: "AZ-900 與 SC-900 模擬題" },
  };
  return [index, ...pages];
}

function glossaryPage(content) {
  const count = content.glossary.categories.reduce(
    (n, c) => n + c.terms.length,
    0,
  );
  return {
    path: "/glossary/",
    label: "名詞庫",
    title: "AZ-900 與 SC-900 名詞庫",
    description: `Azure、身分、資安與合規共 ${count} 個名詞的繁體中文解釋。`,
    app: "glossary",
    group: "速查",
    body: content.glossary.categories
      .map(
        (category) =>
          `<section id="${slug(category.id)}"><h2>${escapeHtml(category.title)}</h2><dl>${category.terms
            .map(
              (term) =>
                `<dt id="${slug(term.id)}">${escapeHtml(term.term)}</dt><dd>${escapeHtml(term.explanation)}</dd>`,
            )
            .join("")}</dl></section>`,
      )
      .join("\n"),
    schema: {
      "@type": "DefinedTermSet",
      name: "AZ-900 與 SC-900 名詞庫",
      hasDefinedTerm: content.glossary.categories.flatMap((c) =>
        c.terms.map((term) => ({
          "@type": "DefinedTerm",
          name: term.term,
          description: term.explanation,
        })),
      ),
    },
  };
}

function faqPage(content) {
  const items = [...content.faqs, ...content.qas];
  const groups = new Map();
  for (const item of items)
    groups.set(item.category, [...(groups.get(item.category) ?? []), item]);
  return {
    path: "/faq/",
    label: "FAQ／Q&A",
    title: "AZ-900 與 SC-900 常見問題",
    description: `考試資訊與兩科觀念的 ${items.length} 則問答。`,
    app: "faq",
    group: "速查",
    body: [...groups]
      .map(
        ([category, list]) =>
          `<section><h2>${escapeHtml(category)}</h2>${list
            .map(
              (item) =>
                `<div class="qa" id="${slug(item.id)}"><h3>${escapeHtml(item.question)}</h3><p>${escapeHtml(item.answer)}</p></div>`,
            )
            .join("")}</section>`,
      )
      .join("\n"),
    schema: {
      "@type": "FAQPage",
      mainEntity: items.map((item) => ({
        "@type": "Question",
        name: item.question,
        acceptedAnswer: { "@type": "Answer", text: item.answer },
      })),
    },
  };
}

function reviewPage(content) {
  const { mustRemember, cheatsheet, examDayChecklist } = content.review;
  return {
    path: "/review/",
    label: "考前速查",
    title: "AZ-900 與 SC-900 考前速查",
    description: "兩科必記重點、易混淆觀念對照與考試當天檢查清單。",
    app: "review",
    group: "速查",
    body: `${Object.entries(mustRemember)
      .map(
        ([exam, list]) =>
          `<h2>${escapeHtml(exam)} 必記重點</h2><ul>${list.map((line) => `<li>${escapeHtml(line)}</li>`).join("")}</ul>`,
      )
      .join("")}
<h2>易混淆觀念</h2><dl>${cheatsheet.map((row) => `<dt>${escapeHtml(row.combination)}</dt><dd>${escapeHtml(row.summary)}</dd>`).join("")}</dl>
<h2>考試當天檢查清單</h2><ul>${examDayChecklist.map((line) => `<li>${escapeHtml(line)}</li>`).join("")}</ul>`,
    schema: { "@type": "WebPage", name: "AZ-900 與 SC-900 考前速查" },
  };
}

function planPage(content) {
  const { weeks, wrongAnswerMethod } = content.plan;
  return {
    path: "/plan/",
    label: "四週讀書計畫",
    title: "AZ-900 與 SC-900 四週讀書計畫",
    description: "28 天的每日閱讀、產出與過關標準，以及錯題分類與補強方法。",
    app: "plan",
    group: "速查",
    body: `${weeks
      .map(
        (week) =>
          `<section><h2>第 ${week.week} 週：${escapeHtml(week.title)}</h2><ol class="days">${week.days
            .map(
              (day) =>
                `<li value="${day.day}"><strong>${escapeHtml(day.title)}</strong><br>閱讀：${escapeHtml(day.reading)}<br>產出：${escapeHtml(day.output)}<br>過關標準：${escapeHtml(day.passCriteria)}</li>`,
            )
            .join("")}</ol></section>`,
      )
      .join("\n")}
<h2>錯題分類與補強</h2><dl>${wrongAnswerMethod.map((row) => `<dt>${escapeHtml(row.type)}</dt><dd>症狀：${escapeHtml(row.symptom)}<br>補強：${escapeHtml(row.remedy)}</dd>`).join("")}</dl>`,
    schema: { "@type": "WebPage", name: "AZ-900 與 SC-900 四週讀書計畫" },
  };
}

function sourcesPage(content) {
  return {
    path: "/sources/",
    label: "官方來源",
    title: "AZ-900 與 SC-900 官方來源",
    description: "本參考書引用的 Microsoft Learn 官方考綱與文件清單。",
    app: "sources",
    group: "速查",
    body: `<ul>${content.sources
      .map(
        (source) =>
          `<li id="${slug(source.id)}"><a href="${escapeHtml(source.url)}" rel="noopener">${escapeHtml(source.title)}</a>（${escapeHtml(source.publisher)}）</li>`,
      )
      .join("")}</ul>`,
    schema: { "@type": "WebPage", name: "AZ-900 與 SC-900 官方來源" },
  };
}

function llmsTxt(pages, content) {
  const exams = content.meta.exams
    .map((exam) => `${exam.code}（${exam.name}）`)
    .join("與 ");
  const lines = [
    `# ${SITE_NAME}`,
    "",
    `> 繁體中文（臺灣）的 ${exams}備考參考書：兩科教材、名詞庫、問答與 ${content.questions.length} 題附解析的原創模擬題。`,
    "",
    content.meta.disclaimer,
    "",
  ];
  for (const group of ["教材", "模擬題", "速查"]) {
    lines.push(`## ${group}`, "");
    for (const page of pages.filter((p) => p.group === group))
      lines.push(
        `- [${page.title}](${pageUrl(page.path)}): ${page.description}`,
      );
    lines.push("");
  }
  lines.push(
    "## Optional",
    "",
    `- [全文（Markdown）](${SITE_URL}/llms-full.txt): 上述所有頁面的純文字合輯`,
    "",
  );
  return lines.join("\n");
}

function llmsFullTxt(content) {
  const out = [`# ${SITE_NAME}`, "", content.meta.disclaimer, ""];
  for (const chapter of content.chapters) out.push(chapter.raw.trim(), "");
  out.push("# 名詞庫", "");
  for (const category of content.glossary.categories) {
    out.push(`## ${category.title}`, "");
    for (const term of category.terms)
      out.push(`- **${term.term}**：${term.explanation}`);
    out.push("");
  }
  out.push("# 常見問題", "");
  for (const item of [...content.faqs, ...content.qas])
    out.push(`## ${item.question}`, "", item.answer, "");
  out.push("# 模擬題", "");
  const caseById = new Map(content.cases.map((item) => [item.id, item]));
  for (const q of content.questions) {
    out.push(`## ${q.exam} 第 ${q.number} 題（${q.domain}）`, "");
    const item = q.caseId && caseById.get(q.caseId);
    if (item) out.push(`情境：${item.title}。${item.scenario}`, "");
    out.push(
      stem(q),
      "",
      `正確答案：${answerText(q)}`,
      "",
      `解析：${q.explanation}`,
      "",
      `常見陷阱：${q.trap}`,
      "",
    );
  }
  return out.join("\n");
}

export function buildStaticSite(content = loadContent()) {
  const pages = [
    ...content.chapters.map(chapterPage),
    ...quizPages(content),
    glossaryPage(content),
    faqPage(content),
    reviewPage(content),
    planPage(content),
    sourcesPage(content),
  ];
  const site = {
    nav: pages,
    disclaimer: content.meta.disclaimer,
    lastVerified: content.meta.lastVerified,
  };
  const files = new Map();
  for (const page of pages)
    files.set(`${page.path.slice(1)}index.html`, layout(site, page));
  const urls = [`${SITE_URL}/`, ...pages.map((page) => pageUrl(page.path))];
  files.set(
    "sitemap.xml",
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((url) => `<url><loc>${url}</loc></url>`).join("\n")}\n</urlset>\n`,
  );
  files.set("llms.txt", llmsTxt(pages, content));
  files.set("llms-full.txt", llmsFullTxt(content));
  return { pages, files, urls };
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  const out = join(root, "dist");
  const { files } = buildStaticSite();
  for (const [name, text] of files) {
    mkdirSync(dirname(join(out, name)), { recursive: true });
    writeFileSync(join(out, name), text);
  }
  console.log(`static pages: ${files.size} files`);
}
