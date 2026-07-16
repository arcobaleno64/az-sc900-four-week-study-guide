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
    lines.forEach((line, i) =>
      pairs.forEach(([a, b]) => {
        if (line.includes(a)) {
          console.error(
            `[錯誤] ${relative(root, f)}:${i + 1} 發現「${a}」，建議「${b}」。`,
          );
          n++;
        }
      }),
    );
  }
if (n) process.exit(1);
console.log("[完成] 繁體中文／臺灣用語檢查通過。");
