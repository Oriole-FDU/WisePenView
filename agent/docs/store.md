# Store 与生命周期规范

## 一、目录归属

- `src/store` 只放生命周期注册和持久化基础设施，不放业务 store，不提供统一业务导出。
- `src/frontendState` 是跨业务的聊天请求状态协议层：当前标签页只保留一组状态，写者按来源写入，发送前统一读取；它不是 `src/store` 的业务导出目录。
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

## 五、本地数据边界

- 使用 `localStorage`、`sessionStorage`、IndexedDB 或 Yjs 持久化时，必须明确数据的账号、会话或标签页归属、命名空间、TTL、清理触发点和容量上限。
- 账号相关草稿与离线文档必须把账号标识纳入存储 key；仅使用 `resourceId` 不能隔离不同账号。
- 登录、登出、401 和跨标签认证变化清理会话状态；主题、语言等全局偏好不包含账号数据，保持全局。
- 草稿缓存属于 best-effort 数据：读取和写入前清理过期或无效记录，超过单条容量或浏览器 quota 时放弃缓存写入，不阻断当前编辑。
- Yjs 本地 room 使用账号与资源的组合命名空间，并在会话结束时清理账号相关 room；浏览器不提供数据库枚举能力时，账号 key 仍必须保证数据隔离。
- 新增本地持久化前先复用现有命名空间和生命周期清理能力，禁止使用无界增长的裸 key。

## 六、禁止事项

- 不新增 `src/store/index.ts` 或其它业务 store barrel。
- 不维护手工枚举全部 store 的 `clearAllStores`。
- 不把只服务单一业务或页面的状态提升为根级全局 store。
- Domain service 不反向 import `components`、`views` 或 `layouts` 下的 `_store`。
- 不为迁移保留旧 store alias、wrapper 或双路径导出。
