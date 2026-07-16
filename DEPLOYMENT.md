# 部署指南

本專案預設使用 GitHub 保存原始碼，並以 Cloudflare Workers Static Assets 發布單頁應用程式。

## 一、部署前檢查

```bash
npm ci
npm run validate
npm run build
npx wrangler deploy --dry-run
```

確認 `dist/` 已產生，且檢核沒有錯誤。

## 二、第一次以本機 CLI 部署

1. 安裝相依套件。
2. 登入 Cloudflare。
3. 確認帳號。
4. 建置並部署。

```bash
npm ci
npx wrangler login
npx wrangler whoami
npm run build
npx wrangler deploy
```

`wrangler.jsonc` 已設定：

```jsonc
{
  "name": "az-sc900-study-guide",
  "compatibility_date": "2026-07-14",
  "assets": {
    "directory": "./dist/",
    "not_found_handling": "single-page-application",
  },
}
```

Cloudflare 會回傳 `workers.dev` 網址。之後可在 Cloudflare Dashboard 綁定自訂網域。

## 二之一、無憑證的暫時預覽部署

Wrangler ４．１０２．０以上可在未登入時建立暫時預覽帳號：

```bash
npm run build
npx wrangler deploy --temporary
```

CLI 會回傳 `workers.dev` 網址與 Claim URL。必須在六十分鐘內登入 Cloudflare 並領取，否則 Cloudflare 會刪除暫時帳號與部署。此方式適合首次展示與驗收，不應取代正式帳號、API Token 與 CI／CD。Claim URL 具有帳號領取權限，必須視為敏感資料。

## 三、GitHub Actions 自動部署

專案已包含 `.github/workflows/deploy-cloudflare.yml`。在 GitHub Repository 設定以下 Actions secrets：

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

API Token 應只給部署所需的最小權限。不要使用 Global API Key，也不要把 Token 寫進 Repository、程式碼、Workflow 或聊天記錄。雲端憑證若公開，通常會比讀書進度更快被人使用。

Secrets 設定完成後，推送至 `main` 會依序執行：

1. `npm ci`
2. `npm run build`
3. `wrangler deploy`

亦可在 GitHub Actions 頁面手動執行 Workflow。

## 四、建立 GitHub Repository

建議 Repository 名稱：

```text
az-sc900-four-week-study-guide
```

初始化後執行：

```bash
git init -b main
git add .
git commit -m "建立 AZ-900 與 SC-900 互動式學習網站"
git remote add origin https://github.com/<帳號>/az-sc900-four-week-study-guide.git
git push -u origin main
```

## 五、自訂網域

在 Cloudflare Workers 專案中新增 Custom Domain，例如：

```text
cert.example.edu.tw
```

建議一併確認：

- HTTPS 已啟用。
- DNS 由 Cloudflare 管理。
- 網站標題、描述與 `robots.txt` 符合公開範圍。
- 若加入流量分析，已更新隱私說明。
- 不公開內部帳號、信箱、Token 或未審核教材。

## 六、回復舊版

Cloudflare 可從部署歷程選擇先前版本回復。GitHub 仍應保留對應 Commit，避免雲端回復後原始碼與正式站再次分裂成兩套現實。

## 七、GitHub Pages 備援方案

本專案使用相對路徑建置，也可把 `dist/` 發布至 GitHub Pages。惟 GitHub Pages 僅提供靜態託管；未來若加入使用者提問 API、跨裝置同步或資料庫，仍應使用 Cloudflare Workers。
