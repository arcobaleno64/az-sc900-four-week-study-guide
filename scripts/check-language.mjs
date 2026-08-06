import { readFileSync, readdirSync } from "node:fs";
import { extname, join, resolve, relative } from "node:path";
const root = resolve(process.cwd()),
  roots = ["content", "data", "src"],
  exts = new Set([".md", ".json", ".vue", ".ts"]),
  pairs = [
    ["数据", "資料"],
    ["网络", "網路"],
    ["服务器", "伺服器"],
    ["存储", "儲存"],
    ["虚拟机", "虛擬機器"],
    ["身份", "身分"],
    ["审计", "稽核"],
    ["访问", "存取"],
    ["账户", "帳戶"],
    ["用户", "使用者"],
    ["软件", "軟體"],
    ["链接", "連結"],
    ["设置", "設定"],
    ["点击", "點選"],
    ["下载", "下載"],
    ["上传", "上傳"],
    ["练习", "練習"],
    ["进度", "進度"],
    ["计划", "計畫"],
    ["选择", "選擇"],
    ["错误", "錯誤"],
    ["知识", "知識"],
    ["时间", "時間"],
    ["这里", "這裡"],
    ["云端", "雲端"],
    ["合规", "合規"],
    // 以下為正體字寫法、但屬中國大陸慣用詞，繁中檢查抓不到，需逐條列出。
    ["運營", "營運"],
    ["數據", "資料"],
    ["實時", "即時"],
    ["激活", "啟用"],
    ["信息", "資訊"],
    ["質量", "品質"],
    ["默認", "預設"],
    ["缺省", "預設"],
    ["屏幕", "螢幕"],
    ["內存", "記憶體"],
    ["硬盤", "硬碟"],
    ["文件夾", "資料夾"],
    ["集群", "叢集"],
    ["智能", "智慧"],
    ["分辨率", "解析度"],
    ["視頻", "影片"],
    ["微軟", "Microsoft"],
  ],
  // 已改名的 Microsoft 產品；考題沿用舊名會教錯學員在考場該認哪個字。
  renamed = [
    ["Azure Active Directory", "Microsoft Entra ID"],
    ["Azure AD", "Microsoft Entra"],
    ["Azure Security Center", "Microsoft Defender for Cloud"],
    ["Azure Sentinel", "Microsoft Sentinel"],
    ["Azure Advanced Threat Protection", "Microsoft Defender for Identity"],
    ["Microsoft Cloud App Security", "Microsoft Defender for Cloud Apps"],
    [
      "Azure Information Protection",
      "Microsoft Purview Information Protection",
    ],
    ["Microsoft 365 Defender", "Microsoft Defender XDR"],
  ];
const walk = (d) =>
  readdirSync(d, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? walk(join(d, e.name)) : [join(d, e.name)],
  );
let n = 0;
for (const d of roots)
  for (const f of walk(join(root, d))) {
    if (!exts.has(extname(f))) continue;
    const lines = readFileSync(f, "utf8").split("\n");
    lines.forEach((line, i) => {
      pairs.forEach(([a, b]) => {
        if (line.includes(a)) {
          console.error(
            `[錯誤] ${relative(root, f)}:${i + 1} 發現「${a}」，建議「${b}」。`,
          );
          n++;
        }
      });
      // 教材刻意說明「舊稱 X，現為 Y」是必要內容，不是誤用。
      const teachesRename = /舊|改名|更名|前身|曾稱/.test(line);
      renamed.forEach(([a, b]) => {
        if (!teachesRename && line.includes(a)) {
          console.error(
            `[錯誤] ${relative(root, f)}:${i + 1} 發現已改名產品「${a}」，應為「${b}」。`,
          );
          n++;
        }
      });
    });
  }
if (n) process.exit(1);
console.log("[完成] 繁體中文／臺灣用語與產品名稱檢查通過。");
