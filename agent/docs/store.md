# Store 与生命周期规范

## 一、目录归属

- `src/store` 只放生命周期注册和持久化基础设施，不放业务 store，不提供统一业务导出。
- 组件状态放到对应组件的 `_store` 目录，例如 `src/components/business/ChatPanel/_store`。
- 页面私有状态放到对应 view 的 `_store` 目录。
- 布局状态放到对应 layout 的 `_store` 目录。
- 只有由 service 维护、表达稳定业务缓存语义的状态才进入 domain；不要因为调用方较多就把 UI 状态提升到 domain。
- 仅供 service 编排使用、无需 React 订阅的缓存优先放在 service 闭包，不创建 Zustand store。
- 组件实例状态优先使用 vanilla Zustand + Provider，由组件挂载和卸载管理实例生命周期。

## 二、跨模块协议

- 同级业务组件之间不直接 import 对方的 `_store`。
- 跨组件通信由共同所有者的 view/layout 编排；需要异步消息状态时，在共同所有者下定义 protocol store。
- Protocol 类型与 store 实现分离。通用组件只接收公开 protocol port 或 callback，不依赖上层 store 实现。
- 领域间协作通过 service 接口和 registry 注入，不通过跨 domain Zustand store 共享内部缓存。

## 三、生命周期注册

- 模块级 store 必须调用 `registerStore` 注册自己的 reset 能力。
- `session` 表示与登录用户绑定的状态；登录、登出、401 和跨标签认证变化时清理。
- `tab` 表示当前浏览器标签内的状态；会话清理会同时清理其下属标签状态。
- 全局生命周期模块不能 import 具体业务 store；新增 store 不应修改认证或全局清理调用点。

## 四、持久化

- Zustand `persist` 必须通过 `createStoreJSONStorage(scope)` 创建存储。
- 不直接使用裸 `sessionStorage` key，避免未加载的懒加载模块无法被全局清理。
- store reset 只恢复内存默认值，持久化命名空间由生命周期模块统一清理。

## 五、禁止事项

- 不新增 `src/store/index.ts` 或其它业务 store barrel。
- 不维护手工枚举全部 store 的 `clearAllStores`。
- 不把只服务单一业务或页面的状态提升为根级全局 store。
- Domain service 不反向 import `components`、`views` 或 `layouts` 下的 `_store`。
- 不为迁移保留旧 store alias、wrapper 或双路径导出。
