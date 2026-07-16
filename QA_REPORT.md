# 品質驗證報告

資料基準日：２０２６年７月１４日  
專案版本：１．０．０

## 內容驗證

[完成] 四週共二十八天，日期連續且無重複。  
[完成] 原創情境題共五十題，AZ-900 與 SC-900 各二十五題。  
[完成] 每題均有四個選項、唯一答案、解析、陷阱與技能領域。  
[完成] 名詞／關鍵字共一百七十五個，識別碼無重複。  
[完成] FAQ 共二十五題，觀念情境 Q&A 共二十三題。  
[完成] Microsoft Learn 官方來源共二十八項。  
[完成] AZ-900 必背二十句、SC-900 必背二十五句。  
[完成] 常見簡體字與非臺灣慣用詞自動檢查通過。

## 程式與建置

[完成] Vue／TypeScript 型別檢查通過。  
[完成] Prettier 格式檢查通過。  
[完成] Vite 正式建置通過。  
[完成] `npm audit` 顯示零項已知套件弱點。  
[完成] 程式碼未檢出使用者姓名、信箱或常見憑證字串。  
[完成] Cloudflare Wrangler `deploy --dry-run` 通過，已辨識十二個靜態檔案。

## Cloudflare 本機執行

[完成] `/` 回傳 HTTP ２００ 與正式 `index.html`。  
[完成] `/knowledge/az-900` 由 `not_found_handling: "single-page-application"` 正確回傳 SPA 首頁。  
[完成] JavaScript 靜態資源回傳 HTTP ２００。

## 瀏覽器煙霧測試

測試瀏覽器：Chromium １４４。  
桌面視窗：１４４０ × １０００。  
手機視窗：３９０ × ８４４。

[完成] 首頁完成掛載。  
[完成] 首頁顯示四週進度。  
[完成] 四週計畫可展開、勾選並寫入本機狀態。  
[完成] Markdown 教材與比較表可呈現。  
[完成] 名詞搜尋、收藏與卡片功能可用。  
[完成] 題庫練習與即時解析可用。  
[完成] FAQ 搜尋與展開可用。  
[完成] `Ctrl＋K` 全站搜尋可用。  
[完成] 顯示主題切換可用。  
[完成] 手機版可正常掛載。  
[完成] 手機導覽與內容切換可用。  
[完成] 測試期間無 JavaScript console error 或 page error。

## 人工視覺檢查

[完成] 桌面總覽、四週計畫、名詞庫與題庫畫面無重疊、截斷或橫向溢位。  
[完成] 手機導覽與名詞庫版面可讀，表單欄位與卡片符合單欄排列。  
[完成] 導覽圖示已標記為裝飾內容，不會污染按鈕的無障礙名稱。  
[完成] 深色切換、列印樣式與響應式樣式已納入 CSS。

## 遠端部署狀態

[完成] Cloudflare Workers Static Assets 設定、SPA fallback、本機執行與 `deploy --dry-run` 均已驗證。  
[警告] ２０２６年７月１４日已實際執行 `npx wrangler deploy --temporary`；執行環境無法連線至 Cloudflare API，Wrangler 回報 `fetch failed`，因此未建立遠端預覽網址。  
[注意] 此阻擋屬執行環境的網路／DNS 限制，不是專案建置或 Cloudflare 設定錯誤。  
[注意] 正式部署仍需在可連線環境完成 Cloudflare 登入，或提供 `CLOUDFLARE_API_TOKEN` 與 `CLOUDFLARE_ACCOUNT_ID`。  
[注意] GitHub 發布仍需建立 Repository、設定遠端並完成 GitHub 驗證；目前專案已包含乾淨 Git 歷史與自動部署 Workflow。

## 部署後仍須確認

[注意] Service Worker 必須在正式 HTTPS 網址實際註冊後，再進行一次離線重載測試。  
[注意] 自訂網域、Cloudflare Web Analytics 與隱私揭露取決於部署帳號設定。  
[注意] GitHub Actions 需要 `CLOUDFLARE_API_TOKEN` 與 `CLOUDFLARE_ACCOUNT_ID`，憑證不可寫入 Repository。  
[注意] 正式應考前仍須再次核對 Microsoft Learn Study Guide 與預約頁顯示的語言版本。
