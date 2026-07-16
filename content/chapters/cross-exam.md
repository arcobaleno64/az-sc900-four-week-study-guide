# 第四篇　兩科重疊內容與易混淆辨析

## 8.1　重疊與差異

| 主題                          | AZ-900 深度                 | SC-900 深度                                                            |
| ----------------------------- | --------------------------- | ---------------------------------------------------------------------- |
| 共同責任                      | 服務模型與雲端責任分配。    | 安全責任與資料／身分責任。                                             |
| Zero Trust／縱深防禦          | Azure 身分與安全概念。      | 核心安全模型與實際控制。                                               |
| Microsoft Entra ID            | Azure 的目錄、驗證與存取。  | 身分類型、驗證、治理與保護更深入。                                     |
| Conditional Access／MFA／RBAC | 知道用途與基本差異。        | 要能區分 Entra roles、Azure RBAC、PIM、Access Reviews、ID Protection。 |
| Defender for Cloud            | 知道它改善 Azure 安全態勢。 | 理解 CSPM、CWPP、建議、標準與工作負載保護。                            |
| Microsoft Purview             | 治理與合規工具的目的。      | 分類、標籤、DLP、保留、eDiscovery、Audit 等細節。                      |

> ［讀書順序］先讀 AZ-900 的雲端、架構與治理，再讀 SC-900 的 Entra、安全與 Purview。兩科共同主題只建立一次主卡片，SC-900 再補深度，能省下大量重複閱讀。

## 8.2　高頻混淆矩陣

| 產品／能力            | 核心問題                      | 題幹線索                       | 不要選它的情況               |
| --------------------- | ----------------------------- | ------------------------------ | ---------------------------- |
| Azure Policy          | 資源設定是否符合規則          | 允許或拒絕不合規資源           | 不是授權使用者               |
| Azure RBAC            | 誰可對 Azure 資源做什麼       | 角色＋主體＋範圍               | 不是設定合規稽核             |
| Resource Lock         | 防誤刪／誤改                  | CanNotDelete／ReadOnly         | 不是備份，也不是永久不可移除 |
| Conditional Access    | 登入情境是否允許              | 訊號→決策→控制                 | 不是第一要素驗證本身         |
| PIM                   | 高權限角色何時啟用            | JIT、限時、核准、MFA           | 不是定期權限複查             |
| Access Reviews        | 存取是否仍有必要              | 定期審查與回收                 | 不是即時風險偵測             |
| ID Protection         | 身分是否有風險                | risky user／sign-in／detection | 不是內部部署 AD 攻擊感測器   |
| Defender for Identity | 內部部署 AD DS 的身分攻擊     | 橫向移動、遭入侵身分           | 不是 Entra 雲端風險服務      |
| Defender for Cloud    | 雲端態勢與工作負載            | CSPM／CWPP／CNAPP              | 不是通用 SIEM                |
| Microsoft Sentinel    | 跨來源安全營運                | SIEM／SOAR／Hunting／Playbooks | 不是單一工作負載防護方案     |
| Defender XDR          | 跨 Microsoft 安全產品關聯攻擊 | 端點、身分、郵件、應用程式     | 不是資料合規工具             |
| Sensitivity label     | 分類並保護內容                | 加密、標記、存取限制           | 不是保留期限                 |
| DLP                   | 防止敏感資料不當外流          | 偵測、警告、限制、阻擋         | 不是法律資料蒐集             |
| Retention             | 內容保留與刪除                | Policy／Label／期限            | 不是查誰做了什麼             |
| eDiscovery            | 法律／調查證據                | 搜尋、保留、檢閱、匯出         | 不是日常活動稽核             |
| Audit                 | 活動追蹤                      | 誰在何時做了什麼               | 不是內容分類                 |

## 8.3　產品選擇判斷樹

1. 題目在問「身分登入」：先看 Authentication、MFA、Passwordless、Conditional Access、ID Protection。

1. 題目在問「權限與角色」：先看 Entra roles、Azure RBAC、PIM、Access Reviews。

1. 題目在問「Azure 資源設定是否合規」：先看 Azure Policy、Defender for Cloud Recommendations、Secure Score。

1. 題目在問「網路攻擊或流量控制」：依層次選 DDoS、WAF、Firewall、NSG、Bastion。

1. 題目在問「集中事件、調查與自動回應」：先看 Microsoft Sentinel；若強調 Microsoft 端點、身分、郵件與應用程式的跨產品攻擊故事，選 Defender XDR。

1. 題目在問「資料分類、防外洩、保留或法律調查」：進入 Microsoft Purview，再依動詞選 label、DLP、retention、eDiscovery、Audit 或 Insider Risk。

1. 題目在問「Azure 平台是否發生服務事件」：Service Health；「如何改善成本與可靠性」：Advisor；「收集遙測與告警」：Azure Monitor。

## 8.4　答題陷阱與拆題公式

| 陷阱                        | 拆解                                                                        |
| --------------------------- | --------------------------------------------------------------------------- |
| 「所有、永遠、完全」        | 基礎考試很少接受絕對語句。共同責任、合規分數、Secure Score 都不是絕對保證。 |
| 功能正確但範圍錯            | 例如用 Entra 角色管理 VM，或用 Azure RBAC 管理使用者密碼。                  |
| 把工具當結果                | 啟用 Defender、Purview 或 Policy 不代表自動達成所有安全或法規要求。         |
| 忽略管理負擔                | 題目要求最少管理時，PaaS／SaaS／Serverless 通常優於自管 VM。                |
| 把可用性當備份              | 區域、區域、複寫與備援不等於版本化、備份與防誤刪。                          |
| 看到 security 就選 Defender | 先確認是在問身分、網路、工作負載、SIEM 還是資料合規。                       |

> ［拆題公式］先找動詞，再找保護對象，再找範圍，最後看限制條件。也就是：要做什麼 → 保護誰／什麼 → 在哪一層 → 最少成本或維運要求。
