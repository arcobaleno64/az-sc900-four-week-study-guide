# gemini-plugin-cc 使用問題記錄

環境：Windows 11、Claude Code、`gemini@gemini-plugin-cc` 0.16.7、AGY 1.1.10、Gemini CLI 0.53.1、Node v24.14.1。
用途：本檔為轉交插件維護者的問題清單，與 `az-sc900-study-site` 專案功能無關。
記錄期間：2026-08-06 起。

---

## #1 — `setup --json` 的就緒欄位互相矛盾，使用者無從判斷該做什麼

**指令**：`node scripts/gemini-companion.mjs setup --json`
**engine**：auto（`requestedEngine` 解析為 `agy`）

**現象**：同一份輸出同時包含

```json
"ready": false,
"readyState": "partial",
"geminiReady": true,
"geminiAuth": { "loggedIn": false, "detail": "OAuth token expired at 2026-08-05T03:27:35.269Z" },
"agyAuth": { "loggedIn": false, "state": "unknown", "verifiable": false }
```

`geminiReady: true` 與 `geminiAuth.loggedIn: false` 直接衝突。`agyAuth.verifiable: false` 表示 AGY 的登入狀態在設計上就無法非互動驗證，因此只要使用者選 AGY 引擎，`ready` 永遠不可能為 `true`。

**影響**：`nextSteps` 要求「Run an `--engine agy` command to confirm it is logged in」，但沒有提供一個不會產生副作用、不會消耗模型額度的探測指令。使用者只能拿真實任務去試。實測 AGY 其實是**已登入可用**的（見 #2 的意外驗證），也就是說 `readyState: "partial"` 是偽警報。

**期望行為**：

1. `geminiReady` 應把 `geminiAuth.loggedIn` 納入計算，或改名為 `geminiBinaryPresent` 之類不會誤讀的名稱。
2. 對 `verifiable: false` 的引擎，提供一個明確的零成本探測（例如 `setup --probe-agy`，跑一次極短的固定提示詞並只回報成功與否），或在 `readyState` 中把「無法驗證」與「已知未登入」區分開來，不要一律降級成 `partial`。

---

## #2 — `task --help` 被當成提示詞送給模型執行，燒掉一次真實 turn

**指令**：`node scripts/gemini-companion.mjs task --help`
**engine**：agy 1.1.10

**現象**：預期印出 `task` 子指令的用法，實際輸出為

```
[gemini] Detecting engine...
[gemini] Starting agy turn...
[gemini] Turn completed.
<!-- delegated model output begins here ... -->
### Antigravity CLI (`agy`) 使用指南
...
**下一步**：請輸入具體任務需求，或執行 `agy models` 查看可切換的模型列表（估時 1 分鐘）。
```

模型把 `--help` 理解成「請說明 agy 的用法」，回了一份 AGY CLI 教學。用法字串其實存在於 `scripts/gemini-companion.mjs:107`，只是沒有被 `--help` 觸發。

**影響**：

- 一次不必要的模型呼叫與額度消耗。這是使用者探索 CLI 時最自然的第一個動作，代價卻是一次計費 turn。
- 輸出內容看似合理（是一份 AGY 說明），使用者不容易察覺自己拿到的不是插件的用法說明。
- 若使用者在 CI 或腳本中誤加 `--help`，會靜默送出網路請求。

**期望行為**：`task`（以及其他接受自由文字的子指令）在參數為 `--help` / `-h` 時，印出 `scripts/gemini-companion.mjs:107` 既有的 usage 字串並以 exit 0 結束，不進入引擎。更廣義地說，以 `--` 開頭且不在已知旗標表中的第一個參數，應該報錯而不是被當作提示詞。

**副作用（正面）**：這次誤觸意外證實了 AGY 引擎實際可正常執行並回應，也就是 #1 的 `readyState: "partial"` 屬偽警報。

---

## #3 — `gemini_job_result` 找不到 `gemini_job_status` 找得到的同一個 job

**指令**：MCP 工具 `mcp__plugin_gemini_gemini__gemini_job_status` 與 `mcp__plugin_gemini_gemini__gemini_job_result`
**參數**：兩者皆為 `workspace: "C:\\Users\\arcobaleno\\Documents\\Code\\az-sc900-study-site"`、`jobId: "task-msgw5279-51b8f7e7fb"`

**現象**：

- `gemini_job_status` 正常回傳完整 job 記錄（`status: "completed"`、`elapsed: "58s"`、含 logFile 路徑）。
- 同一組參數呼叫 `gemini_job_result`，回傳 `No job found for "task-msgw5279-51b8f7e7fb". Run /gemini:status to list known jobs.`
- 改用 CLI `node scripts/gemini-companion.mjs result <jobId>`（同一個 cwd）可正常取得輸出。

**影響**：MCP 路徑無法取回背景工作的結果，只能退回 CLI。對以 MCP 工具驅動流程的使用者而言，背景工作等於單向送出。兩個工具在同一個 server、同一組參數下對「job 是否存在」有不同答案，這是狀態查找路徑不一致。

**期望行為**：兩個工具使用同一套 workspace 正規化與 job 查找邏輯。若 `result` 有額外的前置條件（例如要求輸出已落盤），錯誤訊息應說明真正的原因，而不是宣稱 job 不存在。

**推測**：`status` 與 `result` 對 workspace 路徑的正規化不同（正斜線／反斜線、或 workspace hash 的計算基準不同）。`status` 回傳的 `workspaceRoot` 是正斜線形式 `C:/Users/...`，而傳入的是反斜線形式。

---

## #4 — job 的 `status` 與 `phase` 互相矛盾，且有 job 永久卡在 `queued`

**指令**：`node scripts/gemini-companion.mjs status`
**engine**：agy

**現象一（矛盾）**：`/gemini:status` 的表格同時出現

| Job                      | Status  | Phase |
| ------------------------ | ------- | ----- |
| task-msgwb7cu-6132e95f71 | running | done  |
| task-msgwaog1-345e85942e | queued  | done  |

`queued` 的 job 其 Progress 已包含 `Detecting engine...`、`Starting agy turn...`、`Turn completed.` — 顯然早已開始且已結束。

**現象二（永久卡住）**：`task-msgwaog1-345e85942e` 在 6 分 34 秒後仍為 `status: "queued"`、`phase: "done"`、`startedAt` 欄位不存在、`pid: 18924`。其 `.log` 檔已寫入完整的 `Final output` 與模型回應全文，但 `result` 子指令永遠取不到，因為 job 狀態從未轉為 `completed`。

**影響**：

- 使用者無從判斷該等待、該取消、還是該重跑。
- 已經完成並計費的模型輸出被鎖在狀態機裡，唯一的取回方式是手動去讀 `~/.claude/plugins/data/gemini-gemini-plugin-cc/state/<workspace-hash>/jobs/<jobId>.log` 並自行從 `Final output` 之後解析出內容。本次即是這樣搶救的。
- 一批 19 個背景 job 中出現 1 個，發生率約 5%。

**期望行為**：

1. `status` 與 `phase` 不應能表達互斥的狀態；至少 `phase: "done"` 時 `status` 不得是 `queued`。
2. 工作者寫入 `Final output` 後應保證 job 狀態轉為 `completed`（或在轉換失敗時把 job 標成 `failed` 並附原因）。
3. 提供官方的救援路徑，例如 `result --from-log <jobId>`，讓已完成的輸出不必靠手動解析日誌取回。

---

## #5 — 大型輸出的 job 逾時，且被歸類為「可重試」卻無法透過重試解決

**指令**：`node scripts/gemini-companion.mjs task --background --engine agy`（提示詞要求為 50 題題目各產出 4 段說明文字，預期輸出約 40 KB）
**engine**：agy

**現象**：`result` 回傳

```
Gemini did not return a final message.  Failure: timeout (retryable) Summary: The CLI command timed out. Next step: Retr...
```

**影響**：

- `retryable` 的標記會誤導使用者原地重試。但逾時的原因是輸出量，不是暫時性故障 — 同樣大小的請求重試幾次都會逾時。實際的解法是把工作拆小，而失敗訊息沒有提到這點。
- 沒有可調整逾時的旗標。`task` 的用法字串（`scripts/gemini-companion.mjs:107`）列出 `--background --write --resume --model --effort --engine`，沒有 `--timeout`。使用者除了拆小工作沒有別的選項，但得先自己想到。

**期望行為**：

1. 逾時且已有部分輸出時，`next step` 應建議縮小工作範圍，而不是重試。
2. 提供 `--timeout <seconds>`，或至少在文件中說明單次 turn 的輸出上限量級。
3. 若能取得部分輸出，應一併回傳並標示為不完整，而不是整份丟棄。

**實測數據**：50 題一批必定逾時；拆成 6 批（每批 8～9 題）全部成功，每批約 60～90 秒。

---

## #6 — 大型 diff 的 `adversarial-review` 只審了其中一個檔案就回報 approve

**指令**：`node scripts/gemini-companion.mjs adversarial-review --background --scope working-tree`
**engine**：agy

**當時的工作目錄狀態**：10 個已追蹤檔案變更（7732 insertions / 612 deletions）加上 7 個未追蹤新檔，其中包含

- `src/question-pool.ts`（新檔，加權抽題演算法，約 260 行）
- `src/components/QuestionCard.vue`、`AnswerFeedback.vue`、`CaseScenarioPanel.vue`（三個新元件）
- `tests/question-pool.test.ts`（新測試）
- `src/quiz.ts`、`src/store.ts`、`src/views/QuizView.vue`、`scripts/validate-content.mjs` 的實質邏輯變更

**現象**：完整回覆只有三行

```
Target: working tree diff
Verdict: approve

The visible changes in data/questions.json safely enrich question items with
option rationales, concept IDs, and refined metadata without introducing data
integrity or schema defects.

No material findings.
```

`data/questions.json` 是 diff 中最大的一個檔案（約 7100 行），佔整體變更的 92%。審查只提到它，其餘 9 個已追蹤檔案與 7 個未追蹤新檔完全沒有出現在結論中。

**影響**：這是本次最嚴重的一項。一份**沉默地只審查 8% 變更、卻回報 `approve` 與 `No material findings`** 的審查，比沒有審查更危險 — 使用者會據此認為程式邏輯已被檢視過。實際上全新的抽題演算法、判分分支與三個新元件一行都沒被看過。

`/gemini:review` 的命令文件明確要求「Treat untracked files or directories as reviewable work even when `git diff --shortstat` is empty」，但實際行為並未涵蓋未追蹤新檔。

**期望行為**：

1. 當 diff 因大小被截斷時，**必須**在輸出中明講哪些檔案未被審查，且不得給出 `approve` 這種涵蓋全體的結論。
2. 大型資料檔（JSON／CSV／lock 檔）應與程式碼分開處理，或提供 `--exclude <glob>`，避免單一巨大檔案排擠掉所有程式碼。
3. 未追蹤新檔應確實納入審查範圍，與文件所述一致。

**繞道方式**：改用 `task` 子指令，在提示詞中逐一列出要審的檔案路徑並明講「不要審 data/*.json」，AGY 便會實際讀取並逐檔回報。也就是說引擎有能力做，是 review 路徑的目標選取有問題。

**附帶說明**：用 `task` 繞道後拿到的審查品質很高 —— 逐檔指出 12 項問題，其中 4 項經查證為真 bug（`isAnswered` 對空字串的判定、`recordQuestion` 兩處狀態轉換錯誤、`drawIndex` 零權重固定回傳 0），全部已修復並補上會失敗的回歸測試。引擎不是問題，review 的目標選取才是。

---

## #7 — Windows 上併發背景 job 撞 EPERM，state 檔寫入失敗導致 job 遺失

**指令**：連續啟動多個 `task --background --engine agy`（本次一批 6 個，間隔不到 1 秒）
**engine**：agy
**平台**：Windows 11、Node v24.14.1

**現象**：6 個 job 中 3 個 `status: "failed"`，失敗記錄為

```json
{
  "category": "unknown",
  "retryable": true,
  "summary": "EPERM: operation not permitted, rename
    'C:\\Users\\arcobaleno\\.claude\\plugins\\data\\gemini-gemini-plugin-cc\\state\\
     az-sc900-study-site-8f114d488b583bbd\\.state.json.28072.0239c57a5636.tmp'
     -> 'C:\\Users\\arcobaleno\\.claude\\plugins\\data\\gemini-gemini-plugin-cc\\state\\
        az-sc900-study-site-8f114d488b583bbd\\.state.json'"
}
```

第 4 個 job 的 `<jobId>.json` 與 `<jobId>.log` 都在磁碟上、內容完整、`status: "completed"`，但 `result` 子指令回報 `No job found` —— 共用的 `.state.json` 索引沒有記到它。

**根因推斷**：`lib/state.mjs` 的原子寫入採「寫 tmp 檔 → rename 覆蓋」。這在 POSIX 上是原子的，在 Windows 上不是：當另一個行程正持有目標檔的開啟控制代碼時，`rename` 會直接失敗並拋 `EPERM`。多個 detached worker 同時更新同一份 workspace state 就會撞上。

**這一併解釋了 #4**：卡在 `status: "queued"` 但 `phase: "done"` 的 job，就是狀態轉換的那次寫入被 EPERM 吃掉了；`.log` 有完整輸出、job 記錄卻永遠停在舊狀態。#4 與 #7 是同一個根因的兩種表現。

**影響**：

- 本次 25 個背景 job 中，4 個受影響（16%）。已完成並計費的輸出必須手動從 `.log` 挖出來。
- `retryable: true` 的標記在這裡是對的（重試確實會成功），但錯誤訊息把它歸類為 `category: "unknown"`，使用者看不出這是併發衝突、更不會知道「一次少發幾個 job」就能避開。
- 併發送出正是背景模式的主要使用情境，這個失敗模式打在最常用的路徑上。

**期望行為**：

1. Windows 上的 state 寫入需要跨行程鎖（lock 檔）或帶退避的重試迴圈。`rename` 遇到 `EPERM`／`EBUSY` 時退避重試數次，而不是讓整個 job 失敗。
2. 改成每個 job 各自一個狀態檔（`<jobId>.json` 其實已經是），讓 `result` 不必依賴共用索引就能找到 job —— 目前 `<jobId>.json` 存在但 `result` 仍說找不到，代表查找走的是共用索引而非目錄掃描。單這一項改動就能讓 #4 與 #7 的資料遺失完全消失。
3. 把 `EPERM` 上的 rename 失敗歸入專屬 failure category，訊息說明是併發衝突並建議降低同時啟動的 job 數。

**規避方式**：連續啟動 job 之間插入約 8 秒間隔後，重跑的 3 個 job 全部成功。
