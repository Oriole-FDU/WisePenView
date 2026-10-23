# 验证矩阵

## 基础规则

- 修改前后检查 `git status --short`。
- 代码任务至少运行 `pnpm lint`。
- 交付说明记录实际运行的命令和结果；没有运行的检查不能写成已通过。
- 构建失败时先修复第一个真实错误，不用跳过检查或扩大 ESLint 禁止范围。

## 按变更范围选择

| 变更范围                               | 必需验证                                                                    | 条件验证                                                     |
| -------------------------------------- | --------------------------------------------------------------------------- | ------------------------------------------------------------ |
| Markdown、模板、普通配置               | `git diff --check`                                                          | `pnpm lint`（若影响 JS 配置）                                |
| `src/**/*.ts(x)`                       | `pnpm lint`、`pnpm typecheck`                                               | `pnpm build`（跨层或构建配置）                               |
| `src/**/*.{less,scss,css}`、主题 token | `pnpm lint`、`pnpm check:radius`、`pnpm check:z-index`、`pnpm check:styles` | `pnpm build-storybook`（stories 变更）                       |
| `src/domains/**`、registry、mock       | `pnpm lint`、`pnpm typecheck`、`pnpm check:mock`                            | `pnpm build`                                                 |
| `vite.config.ts`、tsconfig、Electron   | `pnpm lint`、`pnpm typecheck`、`pnpm build`                                 | 对应打包脚本                                                 |
| 应用初始化、认证与运行时配置           | `pnpm lint`、`pnpm typecheck`、`pnpm check:mock`、`pnpm build`              | `pnpm build --mode mock`、配置错误启动检查、浏览器运行态回归 |
| Storybook 配置或 stories               | `pnpm lint`、`pnpm typecheck`                                               | `pnpm build-storybook`                                       |
| UI 交互、路由、浮层                    | 上述静态检查                                                                | 用户明确授权后运行 mock 或浏览器回归                         |

## CI 契约

PR CI 固定执行 commitlint、格式检查、lint、文件长度规则、editor runtime、build、mock contract、API response contract、z-index 层级、圆角 token、样式契约、note link 协议和 whitespace 检查。`Code Quality & Build Gate` 是 GitHub branch protection 的稳定检查名，修改 job 名称前必须同步仓库设置。

本地可用 `pnpm verify:ci` 并行执行与 CI 相同的格式、lint、契约检查、类型检查和构建步骤。

全量 Less → SCSS 遷移另執行 `pnpm build:app --mode mock`、`pnpm build-storybook`、`git diff --check`，比對遷移前後的有序編譯 CSS、完整 CSS Modules 匯出鍵與 composition。`pnpm check:styles` 使用 `node:test` 驗證共用 partial 無 CSS 輸出、Input field 狀態、AppBreadcrumb 匯出與通用字體 token、非 Table 基礎元件及 `_shadcn` 的 SCSS 編譯邊界、scrollbar 宣告不拆分父規則，以及試點元件樣式與 SCSS 守衛。Table 契約另涵蓋私有 partial 無輸出、兩種表格各精確生成 1–16 欄規則、共用類別匯出與 composition、Group 行高規則順序，以及 Table／F33 不跨元件預處理器引用私有樣式。建置與靜態比對不能代替已授權的視覺／互動驗收。

Drive／Group／Resource 業務元件另檢查域內無 Less、所有 CSS Module 可編譯、scrollbar 與後續宣告維持同一父規則，以及 640／768／960px 斷點對應的窄版佈局。

Chat／Sidebar 業務元件另檢查域內無 Less、歷史導覽精確生成 48→1 的延遲規則及其後的 reduced-motion 覆寫、重複選擇器優先級、父宣告與 scrollbar 規則順序、桌面拖拽／禁拖拽區與鍵盤焦點，以及輸入區 container query、640px 窄版和 Sidebar 選取／禁用／收合狀態。編譯輸出比對需逐一記錄等價差異，不得以全域宣告排序或規則合併掩蓋 cascade 變化。

其餘業務元件另檢查整個 `components/business` 無 Less、所有剩餘 Module 可編譯、SelectedMemberList scrollbar 不拆分父規則、桌面窗口按鈕禁拖拽與焦點、UserSearchCombobox／RechargeModal 的 768／640px 斷點、禁用與唯讀狀態、表單與錯誤頁間距、CommandPalette 全域覆寫、Wallet 動畫及 InlineComment 重複規則順序；不藉遷移修補既有業務或樣式缺鍵。

agent／skill 編輯器另檢查域內無 Less、所有 Module 可編譯、七處 scrollbar 不拆分父規則、三組 768px 佈局、編輯區尺寸與預覽表格／圖片的全域選擇器、兩段 footer 宣告順序，以及資產拖入遮罩、prompt 選取／相容狀態、檔案樹焦點與待儲存佇列 resize／失敗／進度樣式。

note、其餘編輯器／runtime、版型、頁面、bootstrap 與樣式 stories 檢查所有 Module 可編譯；另覆蓋 Note 五個本地 checklist mixin 的正文／拖拽預覽、十四處晚宣告 scrollbar、Auth 文字連結的 hover／鍵盤焦點、layout mixin 參數與宣告去重、桌面拖拽／禁拖拽邊界及 Tabs 軟焦點。Less 專屬語法以編譯輸出驗證；計算簡化、格式與獨立宣告位置的等價差異須逐項限定來源、選擇器、屬性、值、上下文與次數，不可寬泛排序或合併規則。

清零契約拒絕 `src`、Storybook 與 Electron 入口的 Less 檔案／樣式引用，以及任何直接 Less 相依；保留上游套件仍宣告的可選相依，不把它當作自有編譯入口。原生 CSS／主題 token 維持原用途。靜態契約不代表已驗證編輯、協作、拖拽、捲動或 resize 互動。

SCSS 迁移系列的依赖 PR 以具名迁移分支为 base 时，仍运行同一 `Code Quality & Build Gate`。系列全部合入后可单独清理临时分支触发配置。

## 运行态记录

运行 mock 或浏览器时记录：日期、浏览器版本、窗口尺寸、操作步骤、预期结果、实际结果和控制台错误。没有启动服务时，不要声称完成页面行为验证。

运行态涉及初始化、认证或资源路由时，至少覆盖 `/login`、`/chat`、`/drive/personal`、资源 PDF／Note／Office／Draw.io 路由；需要时观察首次探测、online／offline、visibilitychange 及停止后的网络请求。应确认资源使用集中配置，mock 模式不发起校内探测，401 只由 App 提示一次并完成登录回跳。
