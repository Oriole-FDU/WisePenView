# Context 规范

Context 用于表达明确的组件树作用域，不作为通用全局状态容器。新增前先确认 props 或现有 store 是否足够。

## 目录和文件

每个项目自有 Context 跟随其 Provider 所属的模块，在该模块下建立 `_context` 目录；不建立全局 `src/contexts`。一个 Context 严格分成三个文件，并通过第四个 `index.ts` 导出：

```text
Feature/_context/
  FeatureContext.ts       # value 协议和 createContext
  FeatureProvider.tsx     # Provider 装配与生命周期
  useFeature.ts           # 消费入口和缺失 Provider 校验
  index.ts                # 对外导出，文件顶部写中文头注释
```

`index.ts` 的头注释须说明 Provider 的装配点、hook 的主要调用点，以及提供的功能。例如：

```ts
/** 调用点：FeatureLayout 装配，FeaturePanel 消费；提供当前 Feature 范围内的启用状态。 */
export { FeatureProvider } from './FeatureProvider';
export { useFeature } from './useFeature';
```

一个目录可以容纳多个 Context，各自仍保持定义、Provider、use hook 三文件。只为该实例型 Context 服务的 store、reducer 等实现可作为附加文件放在同一 `_context` 目录，但不与定义文件混写；共享状态实现则按所属模块另放。不创建旧路径转发层；调用方统一从 `_context` 的 `index.ts` 引入 Provider 和 hook。

## 模板

```ts
// FeatureContext.ts
import { createContext } from 'react';

export interface FeatureContextValue {
  enabled: boolean;
}

export const FeatureContext = createContext<FeatureContextValue | null>(null);
```

```tsx
// FeatureProvider.tsx
import type { ReactNode } from 'react';

import { FeatureContext, type FeatureContextValue } from './FeatureContext';

export function FeatureProvider({
  children,
  value,
}: {
  children: ReactNode;
  value: FeatureContextValue;
}) {
  return <FeatureContext.Provider value={value}>{children}</FeatureContext.Provider>;
}
```

```ts
// useFeature.ts
import { useRequiredContext } from '@/hooks/useRequiredContext';

import { FeatureContext } from './FeatureContext';

export function useFeature() {
  return useRequiredContext(FeatureContext, 'FeatureProvider');
}
```

必需的 Context 使用 `null` 默认值和共用的 `useRequiredContext` guard；不使用伪造的业务默认值。只有无 Provider 时仍有明确合法语义的配置型 Context 才允许真实默认值，并在 hook 中保留该语义。Context 对象只由同目录的 Provider 和 hook 使用。

## 归属和更新

- 应用壳、主题、服务注入分别归属 `layouts/<Layout>/_context`、`theme/_context`、`domains/_registry/_context`。
- 路由作用域归属对应 route 目录；组件实例状态归属对应组件或其运行时目录的 `_context`。
- 作用域由 Provider 的拥有者和生命周期决定，不按消费者位置移动，也不让 layout 反向依赖 view。
- 高频更新且需要独立订阅的状态可在 Context 中提供 Zustand store 实例，由 hook 使用 selector 订阅。
- Provider value 的引用变化会通知消费者；按实际性能问题治理，不为普通 value 预先加入 memo。

迁移时更新所有调用点并删除旧实现，完成后检查无旧路径引用。第三方生成或上游维护的组件不纳入本仓库自有 Context 模板；不要修改生成代码来强行统一目录。
