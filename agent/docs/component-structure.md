# 组件目录契约

本文是组件内部目录、类型入口与公共／私有边界的唯一规范。组件放置和复用范围见 [组件边界](component-boundary.md)。

## 1. 设计原则

1. **固定入口**：每个组件固定有 `index.tsx`；有参数或公开类型契约时必须有 `index.type.ts`，无参且没有公开类型契约的组件不要求类型文件。
2. **三处组织**：私有子组件放 `_parts`，行为逻辑放 `_hooks`，子树内部共享内容放 `_common`；统一加前导下划线，不新增同义分组。
3. **递归一致**：每个 part 都是组件，递归使用同一结构；Controller 的 React 实现归 `_hooks`。
4. **样式就近**：自身样式按需创建在本组件目录，子树共享样式归最近共同组件的 `_common`。
5. **边界明确**：外部只使用组件入口和公开类型；`_parts`、`_hooks`、`_common` 都是私有实现，`_common` 不表示项目公共 API。

## 2. 契约规范

### 目录与职责

```text
ComponentName/
├── index.tsx                 # 固定：组件入口与组合
├── index.type.ts             # 有参数或公开类型契约时必须存在
├── style.module.scss         # 按需：自身样式
├── _parts/                   # 按需：私有子组件
│   └── ChildName/
│       ├── index.tsx
│       ├── index.type.ts
│       └── ...               # 按需递归使用样式、_parts、_hooks、_common
├── _hooks/                   # 按需：行为 hook 及其私有实现
│   └── useSelection.ts
└── _common/                  # 按需：子树内部共享内容
    ├── selectionModel.ts
    ├── style.module.scss
    ├── context/
    └── store/
```

| 位置                | 契约                                                                                                                                                                                       |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `index.tsx`         | 唯一组件实现入口；目录名与主导出名使用相同 PascalCase。负责 JSX、Props 解读、hook 组合、轻量派生值和事件编排。                                                                             |
| `index.type.ts`     | 定义或显式按类型再导出当前组件的 Props、公开 ref／handle、事件参数等公开类型；入口用 `import type` 消费。只含类型声明及类型导入／导出，不含运行时值、枚举、副作用、Context 或 store 实例。 |
| `style.module.scss` | 仅承载当前组件自身样式；无自身样式时不创建。                                                                                                                                               |
| `_parts/ChildName/` | 有独立界面或交互职责的私有组件；有自己的类型入口、样式与按需拆分，不把 part 类型堆到父组件。                                                                                               |
| `_hooks/`           | 内聚行为的状态、动作、异步任务与生命周期整体归属同一个 hook；Controller 放在这里，不设 `controllers`。仅服务该 hook 的纯函数、常量和私有类型就近放置，不伪装成 hook。                      |
| `_common/`          | 多个内部单元共同使用的纯模型、配置、常量、内部类型、共享样式及 Context／store 协议。只服务一个文件的内容优先留在使用处。                                                                   |

- 根部不散放 helper、Controller 或并列组件实现；组织目录固定为 `_parts`、`_hooks`、`_common`。不新增 `components`、`_components`、`controllers`、`_controllers`、`utils`、`helpers`、`config`、`shared`、`parts`、`hooks`、`common`、`_context`、`_store` 等替代路径，也不直接并列放置私有子组件目录。
- `BUSINESS.md`、按需保留的 story、测试和必要静态资源属于附属内容，不构成代码分层；不为模板创建空目录、空样式或无意义 Props。
- 无参且没有公开类型契约时，不要求 `index.type.ts`，不为满足模板创建空类型文件。有参数（包括可选参数、默认值或 ref）、显式组件类型／包装器泛型，或公开 Props／Ref／Handle 时仍要求类型文件；compound 的成员有参数时也不能以根组件无参豁免。单文件私有类型就近定义，多个内部单元共享的私有类型放 `_common`。
- 本契约适用于 base、business、editors 以及 view、layout 中的组件单元。领域模块、路由注册、编辑器 runtime、worklet 和第三方生成代码等独立模块不套组件模板；不将本契约扩成全仓目录改名要求。组件集合中现有的共享 `common` 也统一命名为 `_common`；是否属于某个组件的私有子树仍由 owner 决定，不因目录加下划线改变原有访问范围。

### 样式与状态归属

- part 的私有样式归 part；父组件只控制父级布局。多个内部单元确需共享的样式放在最近共同组件的 `_common/style.module.scss`，不得借用兄弟或祖先组件的私有样式。
- SCSS mixin、函数与变量同样按最近共同 owner 放在 `_common`；token、CSS 输出与 `@use` 继续遵循 [样式规范](component-style.md)。
- 单个 hook 拥有的状态留在 hook；组件实例子树共享的 Context 放 `_common/context/`，共享 store 放 `_common/store/`。定义、Provider、消费与生命周期分别遵循 [Context 规范](context.md) 和 [Store 规范](store.md)；Provider 属于状态协议，不据此把普通 UI 放进 `_common`。
- 页面、布局或领域拥有的状态仍归各自 owner，不因组件消费就移入组件 `_common`。简单局部 state 和轻量事件可留在入口；行为拆分遵循 [Controller 规范](component-controller.md)，不按 Hook 数量拆文件，也不把一组 setter 交给外部 hook 代管。

### 公共／私有边界

| 调用方    | 允许依赖                                                                                          |
| --------- | ------------------------------------------------------------------------------------------------- |
| 组件外部  | `ComponentName/index.tsx` 和 `ComponentName/index.type.ts`；目录导入解析到同一入口。              |
| 组件入口  | 自己的 `_parts`、`_hooks`、`_common`，以及分层允许的公共能力。                                    |
| part      | 自己的入口和内部实现、共同祖先的 `_common`；兄弟 part 由父组件组合。                              |
| 行为 hook | 自己的私有实现、所属子树可见的 `_common`、允许的领域和基础能力。独立行为由入口或共同 owner 连接。 |
| `_common` | 纯模型、基础能力与明确归属的状态协议；不得反向依赖所属组件入口、part 或业务 hook。                |

父 hook 可组合专责自身外部 I/O 的私有子 hook；Context／store 的消费 hook 只访问协议，不组织 UI 流程。外部不得深导入组件私有实现或样式，也不得通过入口转发将私有实现变成公共 API。跨独立组件复用时先提升到合适的公共 owner，再迁移消费方；不新建转发 `index.ts` 或 alias 保留旧入口。

## 3. 写法示范

### 正例：三个文件构成组件

`StatusCard/index.type.ts`：

```ts
export interface StatusCardProps {
  title: string;
  description: string;
}
```

`StatusCard/index.tsx`：

```tsx
import type { StatusCardProps } from './index.type';
import styles from './style.module.scss';

function StatusCard({ title, description }: StatusCardProps) {
  return (
    <section className={styles.root}>
      <h2>{title}</h2>
      <p>{description}</p>
    </section>
  );
}

export default StatusCard;
```

`StatusCard/style.module.scss`：

```scss
.root {
  display: grid;
}
```

没有自身样式时，省略样式文件、导入和 `className`；有参数的组件仍保留入口和类型文件。

### 正例：hook 拥有完整行为

`SelectionPanel/_hooks/useSelection.ts`：

```ts
import { useState } from 'react';

export function useSelection() {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const toggle = (id: string) => {
    setSelectedIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
    );
  };

  const clear = () => setSelectedIds([]);

  return { selectedIds, toggle, clear };
}
```

入口调用 `useSelection()` 并组合其结果；不另在入口维护同一组状态再向 hook 传 setter。

### 正例：part 拥有自己的类型

`StatusCard/_parts/CardTitle/index.type.ts`：

```ts
export interface CardTitleProps {
  title: string;
}
```

`StatusCard/_parts/CardTitle/index.tsx`：

```tsx
import type { CardTitleProps } from './index.type';

function CardTitle({ title }: CardTitleProps) {
  return <h2>{title}</h2>;
}

export default CardTitle;
```

父入口通过 `import CardTitle from './_parts/CardTitle';` 引入，并用 `<CardTitle title={title} />` 替换原有标题。示例中的 part 有参数，因此无自身样式时保留入口和类型两个文件；无参且没有公开类型契约的 part 可只保留 `index.tsx`；再拆分时仍用自己的 `_parts`、`_hooks`、`_common`。

### 无参组件

```tsx
// EmptyState/index.tsx：没有参数和公开类型契约，无需 index.type.ts。
export default function EmptyState() {
  return <p>暂无内容</p>;
}
```

### 反例

```text
StatusCard/
├── index.tsx                 # 内联公开 Props／handle，缺少 index.type.ts
├── CardTitle.tsx             # 私有组件未进入 _parts/CardTitle/index.tsx
├── formatTitle.ts            # 根部散放 helper
├── controllers/              # Controller 应放 _hooks
├── _components/              # 私有子组件应放 _parts，不新增同义目录
└── shared/style.module.scss  # 内部共享样式应放 _common
```

```ts
// 错误：类型文件包含运行时值。
export const DEFAULT_LIMIT = 10;

// 错误：组件外部绕过公开入口访问私有实现与样式。
import CardTitle from '@/components/base/StatusCard/_parts/CardTitle';
import styles from '@/components/base/StatusCard/style.module.scss';

// 错误：part 借用父组件私有样式；需要共享时由父级 _common 承载。
import parentStyles from '../../style.module.scss';
```

## 4. Lint 检查

组件专题接入 [契约 lint 基础设施](lint.md)，在 `lint/contracts.js` 登记 `component`，结构错误默认级别为 `error`。专项命令约定为：

```bash
pnpm lint:component
```

命令映射为 `node scripts/check-contract-lint.mjs component`；专题规则沿用同一插件、ESLint 配置和专项检查入口，不另建扫描脚本。专项检查命中 warning 或 error 均返回 1；全项目 `pnpm lint` 按规则级别判定失败。

默认 `pnpm lint` 和 CI 同时启用 `wisepen/component-structure`，级别为 `error`；旧 `component-conventions` 规则及其整文件基线已经删除。

| 检查项          | 已实现范围                                                                                                                                                               |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 固定类型入口    | `src/components`、`src/views`、`src/layouts` 中的有参数或公开类型契约的组件必须有 `index.type.ts`，无参且无公开类型契约时豁免；part 递归适用，无法静态定位实现时不豁免。 |
| 类型文件纯类型  | 类型文件只允许 interface、type、类型导入／导出和空语句；拒绝运行时声明、值导入和副作用。                                                                                 |
| Props／ref 归属 | 拒绝入口顶层的 `*Props`、`*Ref`、`*Handle` 声明及可识别 UI 函数参数的内联对象类型；主实现参数直接引用的导入类型必须经自身 `index.type.ts` 定义或按类型再导出。           |
| 入口与根部布局  | 检查 PascalCase、主导出与目录名称、同入口多个具名 UI 实现、固定文件和组织目录白名单。                                                                                    |
| 扁平组件        | 可识别的 PascalCase UI 函数不能留在其它 `.tsx` 文件；story／test／spec 与专用 Context Provider 不套普通 UI 入口。                                                        |
| 外部私有导入    | 检查静态 import、再导出、动态 import 字面量及 TS import type；禁止组件范围外深导入 `_parts/_hooks/_common`。                                                             |
| 样式边界        | 检查组件私有 CSS Module 的跨组件借用和名称；内部共享样式通过共同 owner 的 `_common` 消费。story 附属样式不强制改名。                                                     |

路径解析支持 `@/` 和相对路径，`_shadcn` 的第三方生成内容不在检查范围内。其它路径别名、计算生成的动态路径、SCSS 内部依赖、任意跨模块类型推断不属于当前覆盖。规则不把整个 `_common` 视为组件：Context Provider 和独立技术模块仍按各自契约组织。

是否值得拆 part、行为是否内聚、状态 owner、兄弟 part 如何组合和 `_common` 的反向依赖仍需 Review。类型文件存在不等于公开契约已经完整；当前检查也不追踪任意类型别名的完整可达性。不能据 lint 通过声称复杂组件的职责治理已经完成。

## 5. 机械迁移

1. 确认组件 owner、公开入口和类型，区分组件与独立技术模块。
2. 有参数或公开类型契约时补齐 `index.type.ts`，迁出 Props、公开 ref／handle 等类型，改用类型导入；无参且没有公开类型契约时不创建空类型文件，不把运行时值搬进类型文件。
3. 将私有组件移入 `_parts` 并递归规范；Controller 和行为移入 `_hooks`，内部共享模块与组件 Context／store 移入 `_common`。
4. 自身样式就近保留，共享样式移入最近共同 owner 的 `_common`；更新所有导入和类型再导出，删除旧目录、转发与 alias。
5. 按 [验证矩阵](verification.md) 完成检查；运行 `pnpm lint:component`，并移除本次已解决的迁移清单项。机械移动保持运行语义，职责重构单独审查。

## 6. 复杂组件 TODO

无法一次迁移的复杂历史组件，集中登记在 `lint/component-todos.js` 的具名迁移清单。清单记录待完成事项，不另设一套合法结构。

- 每个文件项用 `reason` 写明历史原因和待迁移步骤，用 `diagnostics` 记录诊断编号与精确目标（组件名、类型名或依赖路径）。清单中的文件路径是定位入口；移动文件后必须同步清单。
- 仅豁免登记时已存在且明确列出的诊断；不得忽略整个目录、组件子树或整条规则，不得按 warning 总数设置基线。
- 不向清单追加新违规；同一历史组件中的新增代码、其他诊断与未登记文件仍执行默认 `error` 门禁。
- 诊断消失或出现次数减少时，lint 报 `staleTodo`，要求删除对应豁免；同一诊断出现次数增加仍报错。默认及专题扫描还通过 `src/main.tsx` 检查清单中的文件仍然存在；删除整个文件也必须移除对应文件项。旧整文件基线不再保留。
- 同目标、同次数的诊断匹配不追踪 Git 行级身份；等量替换仍需 Review。修改清单时必须审查原因和具体诊断，不能把新增违规重新登记为历史问题。
