import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";
import { readFileSync } from "node:fs";
import {
  SITE_URL,
  answerText,
  buildStaticSite,
  loadContent,
} from "../scripts/static-pages.mjs";

// The read-only pages are what crawlers and answer engines see; the hash app
// at "/" is invisible to them. These tests guard what those readers get.
const content = loadContent();
const { pages, files, urls } = buildStaticSite(content);
const html = (path: string) =>
  files.get(`${path.slice(1)}index.html`) as string;
const allHtml = pages.map((page) => html(page.path)).join("\n");
const escape = (text: string) =>
  text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
type Q = Record<string, any>;
const byType = (type: string) =>
  content.questions.find((q: Q) => q.type === type) as Q;

test("每一章、每個名詞、每則問答、每個情境與每一題都有不需 JavaScript 的頁面", () => {
  for (const chapter of content.chapters)
    assert.ok(files.has(`knowledge/${chapter.id}/index.html`), chapter.id);
  const missing = [
    ...content.glossary.categories.flatMap((c: Q) =>
      c.terms.map((t: Q) => t.term),
    ),
    ...[...content.faqs, ...content.qas].map((item: Q) => item.question),
    ...content.cases.map((item: Q) => item.scenario),
    ...content.questions.map((q: Q) => q.explanation),
  ].filter((text) => !allHtml.includes(escape(text)));
  assert.deepEqual(missing, []);
  const ids = [...allHtml.matchAll(/<article class="question" id="([^"]+)"/g)];
  assert.equal(ids.length, content.questions.length);
});

test("五種題型的正確答案都寫成文字，不是隨機排列後會失效的代號", () => {
  const single = byType("single");
  assert.equal(
    answerText(single),
    single.options.find((o: Q) => o.id === single.answer).text,
  );
  const multiple = byType("multiple");
  assert.equal(answerText(multiple).split("；").length, multiple.answer.length);
  assert.match(answerText(byType("true-false")), /^(正確|錯誤)$/);
  const matrix = byType("yes-no-matrix");
  assert.ok(
    answerText(matrix).includes(
      `「${matrix.statements[0].text}」${matrix.statements[0].answer ? "是" : "否"}`,
    ),
  );
  const dropdown = byType("dropdown");
  const segment = dropdown.segments[0];
  assert.ok(
    answerText(dropdown).includes(
      `${segment.label}：${segment.options.find((o: Q) => o.id === segment.answer).text}`,
    ),
  );
  assert.ok(!allHtml.includes("{g1}"), "下拉題的佔位符要換成空格");
  for (const q of content.questions)
    assert.ok(
      allHtml.includes(`正確答案：</strong>${escape(answerText(q))}`),
      q.id,
    );
});

test("站內連結都指向產生的頁面、首頁或互動版的 hash 路由", () => {
  const known = new Set([...pages.map((page) => page.path), "/"]);
  const assets = new Set(["/static.css", "/icon.svg"]);
  const broken = [...allHtml.matchAll(/href="(\/[^"]*)"/g)]
    .map(([, href]) => href)
    .filter(
      (href) =>
        !href.startsWith("/#/") && !known.has(href) && !assets.has(href),
    );
  assert.deepEqual([...new Set(broken)], []);
  const fallback = readFileSync(
    new URL("../index.html", import.meta.url),
    "utf8",
  );
  const fallbackBroken = [...fallback.matchAll(/<a href="(\/[^"]*)"/g)]
    .map(([, href]) => href)
    .filter((href) => !known.has(href));
  assert.deepEqual(fallbackBroken, []);
});

test("sitemap 與 llms.txt 列出的網址剛好是首頁加上所有產生的頁面", () => {
  const expected = [
    `${SITE_URL}/`,
    ...pages.map((page) => `${SITE_URL}${page.path}`),
  ].sort();
  assert.deepEqual([...urls].sort(), expected);
  const sitemap = [
    ...(files.get("sitemap.xml") as string).matchAll(/<loc>([^<]+)<\/loc>/g),
  ].map(([, url]) => url);
  assert.deepEqual(sitemap.sort(), expected);
  for (const url of expected)
    assert.match(url, /\/$/, `${url} 需以 / 結尾，避免轉址`);
  const llms = files.get("llms.txt") as string;
  for (const page of pages)
    assert.ok(llms.includes(`(${SITE_URL}${page.path})`), page.path);
});

test("canonical 指向自己，JSON-LD 可解析且關不掉 script 區塊", () => {
  for (const page of pages) {
    const text = html(page.path);
    assert.ok(
      text.includes(`<link rel="canonical" href="${SITE_URL}${page.path}">`),
      page.path,
    );
    const block = text.match(
      /<script type="application\/ld\+json">([\s\S]*?)<\/script>/,
    );
    assert.ok(block, page.path);
    assert.ok(!block[1].includes("<"), page.path);
    assert.equal(JSON.parse(block[1]).url, `${SITE_URL}${page.path}`);
  }
});

test("資料中的 HTML 字元會被跳脫", () => {
  const tampered = structuredClone(content);
  tampered.faqs[0].question = '<img src=x onerror="alert(1)">';
  const page = buildStaticSite(tampered).files.get("faq/index.html") as string;
  assert.ok(!page.includes("<img src=x"));
  assert.ok(page.includes("&lt;img src=x"));
});

test("首頁與 robots.txt 使用產生器的正式網址", () => {
  const index = readFileSync(new URL("../index.html", import.meta.url), "utf8");
  assert.match(index, new RegExp(`rel="canonical"\\s+href="${SITE_URL}/"`));
  const robots = readFileSync(
    new URL("../public/robots.txt", import.meta.url),
    "utf8",
  );
  assert.ok(robots.includes(`Sitemap: ${SITE_URL}/sitemap.xml`));
});

test("service worker 只接手 app shell 的導覽，純文字頁交給網路", () => {
  const source = readFileSync(
    new URL("../public/sw.js", import.meta.url),
    "utf8",
  );
  const base = "https://example.test/book/";
  const events: Record<string, (event: any) => void> = {};
  vm.runInNewContext(source, {
    URL,
    caches: {},
    fetch: () => new Promise(() => {}),
    self: {
      location: { origin: new URL(base).origin, href: `${base}sw.js` },
      addEventListener: (name: string, fn: any) => (events[name] = fn),
    },
  });
  const answered = (url: string) => {
    let hit = false;
    events.fetch({
      request: { method: "GET", mode: "navigate", url },
      respondWith: () => (hit = true),
    });
    return hit;
  };
  assert.equal(answered(base), true, "app shell 要能離線開啟");
  assert.equal(answered(`${base}index.html`), true);
  assert.equal(
    answered(`${base}knowledge/az-900/`),
    false,
    "純文字頁不得被快取成 index.html",
  );
});
