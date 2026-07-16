# AZ-900 × SC-900 四週密集衝刺

以繁體中文與臺灣用語製作的單頁互動式學習參考書，內容由《AZ-900 × SC-900 四週密集衝刺學習參考書》結構化轉換而成。

[注意] 本專案為原創學習整理，並非 Microsoft 官方出版品，也不包含實際考題或題庫外洩內容。正式應考前，請再次核對 Microsoft Learn 官方 Study Guide、考試語言與預約頁資訊。

## 功能

- 四週、二十八天學習進度與每日備忘。
- AZ-900 與 SC-900 結構化 Markdown 教材。
- 五十題原創情境題，支援練習、模擬、錯題重練與領域統計。
- 一百七十五個名詞與關鍵字，支援搜尋、收藏、熟悉度與隨機抽卡。
- 二十五題 FAQ 與二十三題觀念情境 Q&A。
- 考前速查、必背句與應考日清單。
- 全站搜尋、深色模式、列印樣式與 PWA 離線快取。
- 學習資料僅保存於瀏覽器 `localStorage`，可匯出或匯入 JSON。

## 技術架構

- Vue 3
- TypeScript
- Vite
- Markdown 與 JSON 內容來源
- Cloudflare Workers Static Assets
- 原生 Service Worker

## 本機執行

需求：Node.js 22 或相容版本。

```bash
npm install
npm run dev
```

瀏覽器開啟 Vite 顯示的本機網址。

## 驗證與正式建置

```bash
npm run validate
npm run build
npm run preview
```

`npm run validate` 會檢查：

- 四週二十八天是否完整且連續。
- 兩科題數是否各二十五題。
- 每題是否具有四個選項、唯一答案、解析、陷阱與技能領域。
- 名詞識別碼、FAQ 與 Q&A 識別碼是否重複。
- 官方來源是否均為 Microsoft Learn HTTPS 網址。
- 必背句數量、考綱版本與內容摘要是否一致。
- 是否混入常見簡體中文或非臺灣慣用詞。
- Vue 與 TypeScript 型別是否通過。

## 內容目錄

```text
content/chapters/       教材 Markdown
  start-here.md
  az-900.md
  sc-900.md
  cross-exam.md

data/                   結構化 JSON
  study-plan.json
  questions.json
  glossary.json
  faq.json
  qa.json
  review.json
  sources.json
  exam-meta.json

src/                    Vue 單頁應用程式
public/                 PWA、圖示與靜態檔案
scripts/                內容與語言檢查
```

## 更新教材

1. 先核對官方 Study Guide 與技能領域權重。
2. 修改 `content/chapters` 或 `data` 的單一內容來源。
3. 更新 `data/exam-meta.json` 的 `lastVerified` 與生效日期。
4. 執行 `npm run validate`。
5. 執行 `npm run build` 並進行桌面、手機、深色、列印及離線檢查。
6. 以 Git 提交變更，保留審稿軌跡。

不要同時手動維護 DOCX、HTML、題庫與 FAQ。那會生出四份都自稱最新版的教材，人類組織通常稱之為「版本管理」。

## 文件

- 部署方式：[`DEPLOYMENT.md`](DEPLOYMENT.md)
- 發布前檢核：[`REVIEW_CHECKLIST.md`](REVIEW_CHECKLIST.md)
- 品質驗證結果：[`QA_REPORT.md`](QA_REPORT.md)
- 隱私與本機資料：[`PRIVACY.md`](PRIVACY.md)
