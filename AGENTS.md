# WisePenView Agent 规约

本文件是 WisePenView 的 agent 主入口。开始代码修改前先读这里；只在任务涉及对应领域时，再阅读 `docs/agent` 下的专题文档。

## 项目事实

- 技术栈：Vite、React 19、TypeScript strict、Less CSS Modules、HeroUI、ahooks、zustand。
- 包管理和脚本使用 `pnpm`：`pnpm lint`、`pnpm typecheck`、`pnpm build`、`pnpm dev`、`pnpm mock`。
- 注释使用中文，commit message 使用中文。
- UI 基础控件使用 HeroUI 或项目已有封装。

## 工作方式

- 修改前查看 `git status --short`，不要回滚或覆盖用户已有改动。
- 先用 `rg` 查找同域、同类型实现，复用当前代码模式。
- 保持改动范围贴近任务，不做无关重构、格式化或依赖升级。
- 不确定业务接口、字段含义、权限边界或后端契约时先确认，不用兜底代码掩盖不确定性。
- 第三方 API 不确定时优先看官方文档或项目内既有用法，不盲扫 `node_modules`。
- 未经用户明确要求，不启动服务（如 `pnpm dev`、`pnpm mock`）或进入浏览器/可视化调试；需要运行态验证时，先说明原因并等待确认。

## 重构与迁移

- 当任务涉及重构、迁移、替换、改名、统一 API、删除旧实现时，默认一次性迁移到目标设计。
- 不要为了“兼容旧调用方”“逐步迁移”“减小改动面”而保留 wrapper、alias、deprecated API、双路径逻辑或临时桥接层。
- 旧 hook、旧组件、旧类型、旧函数、旧文件应在迁移完成后同步删除，除非用户明确要求保留。
- 需要全局搜索并更新所有调用点，确保代码库只剩目标 API 和目标实现。
- 兼容层只能在以下情况保留：外部公开 API、第三方依赖要求、后端协议兼容、或用户明确要求保留兼容。
- 如果认为必须保留兼容层，先说明原因并等待确认，不要自行添加。
- 完成标准：无旧 API 引用、无无用 wrapper、无重复实现、测试或类型检查通过。

## 代码边界

- 领域链路保持 `component/view -> useXxxService -> service -> mapper -> api -> request`。
- API DTO 只放在 `src/domains/<Domain>/apis/*Api.type.ts`，不直接泄漏到组件 props。
- 字段映射、协议兼容、ID/时间/枚举归一化集中在 mapper。
- service 负责编排和抛错，不做 UI 提示，不直接 import Axios，不直接 import 其它 service 实现。
- 真实 service 只在 `src/domains/_registry/registry.impl.ts` 装配；mock service 只在 `registry.mock.ts` 装配。
- 组件通过 `useXxxService()` 获取领域能力；跨 service 依赖通过 registry 显式注入。

## React 与样式

- 只写函数组件和 Hooks，不使用 `React.FC` / `FC`，不新增 `any`。
- 默认不使用 `useEffect`；请求用 `useRequest`，交互逻辑放事件处理函数，生命周期语义优先用已有 hook。
- 必须使用 effect 时，直接使用 React `useEffect`，并在调用点用带 `@wisepen-manual-effect` 标记的中文 JSDoc 说明执行时机、不可替代原因和 cleanup。React Hooks lint 规则不做豁免。
- 业务代码默认禁止 `useMemo`、`useCallback`、`useUpdateEffect`；确有必要时直接使用 React `useMemo` / `useCallback`，并在调用点用带 `@wisepen-manual-memo` 标记的中文 JSDoc 说明为什么、收益和失效条件。React Hooks lint 规则不做豁免。
- `useRef` 优先用于 DOM 节点、第三方实例、定时器、异步竞态标记等不参与渲染的数据；父子组件的业务状态同步优先使用 props、状态或版本号。
- 只有确实需要操控子组件实例命令（例如聚焦编辑器、滚动到选区、打开查找框）时，才通过 `useImperativeHandle` 暴露 interface；不要用 ref 传递普通刷新、重新请求等业务事件。
- 第三方组件的 ref 和实例类型必须优先使用官方类型；禁止用 `RefObject<never>` 或宽泛类型断言掩盖类型不匹配。发现本地类型与第三方 API 不一致时，应先按真实契约收敛调用。
- 新增或修改 ref 后必须确认 `ref.current` 被实际读取；未读取的 ref、仅为预留而存在的 ref 和已迁移 API 的旧 ref 类型应及时删除。
- 样式使用 Less CSS Modules，类名用 camelCase，避免非必要内联样式。
- 业务弹窗优先使用 `AppAlertDialog`、`AppFormDialog`、`AppDisplayDialog`、`AppModal`；普通业务代码不直接使用底层 `Modal` / `AlertDialog`。

## 按需阅读

- 领域 API、请求类型：`docs/agent/domain-api.md`
- 字段映射、fallback、协议兼容：`docs/agent/domain-mapper.md`
- Service 编排、依赖注入、错误处理：`docs/agent/domain-service.md`
- Entity、Enum、常量：`docs/agent/domain-entity.md`
- 组件放置位置、components 与 views 边界：`docs/agent/component-boundary.md`
- React、Hooks、JSX、TypeScript：`docs/agent/component-react.md`
- 大组件、复杂 Hook 与 Controller 拆分：`docs/agent/component-controller.md`
- 样式、UI 组件库、Overlay：`docs/agent/component-style.md`、`docs/agent/overlay.md`
- Store 归属、注册和生命周期：`docs/agent/store.md`
- 分支与 commit：`docs/agent/commit.md`

跨层任务按数据流补读：`view/component -> service -> mapper -> api -> entity/enum`。

## 隐私与安全

- 不在提交时泄漏用户隐私、敏感信息、后端协议或第三方 API key。
- mock数据应该采用虚拟化、匿名化、脱敏化处理，避免泄漏真实用户和开发者信息。

## 验证与交付

- 默认至少运行 `pnpm lint`；涉及类型、构建或跨层链路时运行 `pnpm typecheck` 或 `pnpm build`。
- 如果某项验证未运行，交付说明里明确原因和建议命令。
- 最终说明包含：改了什么、为什么这样改、跑了哪些验证、仍需确认的风险。

## Codex 加载建议

- 仓库级持久规则放在根目录 `AGENTS.md`，保持短而准；专题细则放在 `docs/agent`。
- 个人表达偏好、默认审批/沙箱、MCP 等放在 `~/.codex/config.toml` 或 `~/.codex/AGENTS.md`，不要写进仓库规约。
- 若必须继续使用其它文件名，在 Codex 配置里设置 `project_doc_fallback_filenames`；本仓库优先使用标准 `AGENTS.md`。
