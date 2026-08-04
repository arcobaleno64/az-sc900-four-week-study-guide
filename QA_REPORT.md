# 品質驗證報告

資料基準日：２０２６年８月３日
考綱重新核對日：２０２６年８月３日
專案版本：１．０．０

## ２０２６年考綱重新核對

[完成] [AZ-900 官方 Study Guide](https://learn.microsoft.com/zh-tw/credentials/certifications/resources/study-guides/az-900) 目前技能測量日期為 ２０２６年７月２０日；三個技能領域及權重與 `data/exam-meta.json` 相符。

[完成] [SC-900 官方 Study Guide](https://learn.microsoft.com/zh-tw/credentials/certifications/resources/study-guides/sc-900) 目前技能測量日期為 ２０２６年７月２８日；四個技能領域及權重與 `data/exam-meta.json` 相符。

[完成] 針對官方變更記錄列出的微調領域核對現有教材；相關新版技能項目已涵蓋：AZ-900 包含 VM Scale Sets、應用程式裝載選項與 Azure Monitor Alerts；SC-900 包含 Agent ID、網路分割、Key Vault、Defender Vulnerability Management、Defender Threat Intelligence 與 Microsoft Defender portal。

[完成] 本次未發現需要更正的考綱日期、權重或教材敘述；`lastVerified` 已更新為 `2026-08-03`。
[完成] 題庫總數及各科題數改由 `data/questions.json` 自動計算；驗證器不再限制五十題或每科二十五題，但仍要求每科至少一題且題號連續。

## 內容驗證

[完成] 四週共二十八天，日期連續且無重複。  
[完成] 原創情境題共五十題，AZ-900 與 SC-900 各二十五題。  
[完成] 題庫包含四十八題單選、一題複選與一題是非；每題均有有效答案、解析、陷阱、技能領域與官方來源。

[完成] 單選、複選與是非題判分測試共五項，全部通過。
[完成] 負向契約驗證確認空白題幹、難度、關鍵字與選項 ID／文字會被驗證器拒絕。
[完成] 名詞／關鍵字共一百七十五個，識別碼無重複。  
[完成] FAQ 共二十五題，觀念情境 Q&A 共二十三題。  
[完成] Microsoft Learn 官方來源共二十九項。
[完成] AZ-900 必背二十句、SC-900 必背二十五句。  
[完成] 常見簡體字與非臺灣慣用詞自動檢查通過。

## 程式與建置

[完成] Vue／TypeScript 型別檢查通過。  
[完成] Prettier 格式檢查通過。  
[完成] Vite 正式建置通過。  
[完成] `npm audit` 顯示零項已知套件弱點。  
[完成] 程式碼未檢出使用者姓名、信箱或常見憑證字串。  
[完成] Cloudflare Wrangler `deploy --dry-run` 通過，已辨識十三個靜態檔案。

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
[完成] 單選、複選、是非三種題型均以實際作答流程完成；複選可保留兩個選項並以任意順序正確計分，是非題的 `false` 答案不會被視為未作答。
[完成] 題目選項以 `aria-pressed` 暴露選取狀態，作答結果以 `role="status"` 提供輔助科技可判讀的狀態訊息。
[完成] 考前速查的列印按鈕可進入瀏覽器原生列印流程，未再發生模板全域變數錯誤。
[完成] 官方來源頁以資料陣列動態顯示二十九項；錯題池為零時，題數選單停用並顯示「無可用題目」。
[完成] 側欄資料基準改由 `exam-meta.lastVerified` 顯示，瀏覽器確認為 `2026-08-03`。
[完成] FAQ 搜尋與展開可用。  
[完成] `Ctrl＋K` 全站搜尋可用。  
[完成] 顯示主題切換可用。  
[完成] 手機版可正常掛載。  
[完成] 手機導覽與內容切換可用。  
[完成] 測試期間無 JavaScript console error 或 page error。
[注意] 本輪 Edge 連接器日誌出現四筆擴充功能訊息通道關閉錯誤；未見 Vue 或本站程式堆疊，判定為瀏覽器擴充橋接層訊息，不列為應用程式缺陷。

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
