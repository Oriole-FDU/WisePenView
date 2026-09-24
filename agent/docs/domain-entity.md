# Domain Entity、Enum 与常量规范

Entity 定义前端展示和业务编排会长期使用的复杂类型。Enum 和常量定义领域内稳定的状态、权限、类型和展示映射。

## 一、Entity 职责

Entity 应定义：

- 展示会用到的复杂业务类型，例如组、人、资源、笔记、钱包记录。
- 已经过 mapper 归一化后的前端类型。
- 多个 view/component/service 共享的领域类型。

Entity 不应定义：

- 后端 raw DTO。
- 只在单个函数内部使用的临时类型。
- UI 组件私有 Props。
- API request/response 类型。

常见路径：

```text
src/domains/<Domain>/entity/<entity>.ts
```

## 二、Enum 与常量职责

Enum 和常量应定义：

- 领域状态值。
- 权限动作。
- 资源类型。
- 后端枚举到前端展示文案或选项的稳定映射。

常见路径：

```text
src/domains/<Domain>/enum/index.ts
```

若只是页面私有配置，放在 view 目录或组件同目录配置文件，不要提升到 domain。

## 三、类型来源边界

- 后端协议类型手写在同域 `apis/*Api.type.ts`，属于 API 层输入。
- mapper 输出的稳定展示类型放入 entity。
- 组件 Props 只描述组件契约，不重复发明领域实体。
- service 的请求/响应类型放在 `service/index.type.ts`，表达业务能力语义。

## 四、命名与导出

- Entity 类型使用 PascalCase，例如 `Group`、`GroupMember`、`ResourceItem`。
- 枚举或枚举工具按现有项目模式命名，例如 `ROLE`、`GROUP_FILE_ORG_LOGIC`。
- 通过 `src/domains/<Domain>/index.ts` 导出领域公共类型。
- 不通过领域出口导出 service 实现细节、API raw 类型或 mock 细节。

## 五、检查清单

- [ ] Entity 是前端稳定展示类型，不是后端 raw DTO。
- [ ] API DTO 没有被组件直接消费。
- [ ] 页面私有配置没有过度上提到 domain。
- [ ] 领域公共类型通过 domain index 导出。
- [ ] 未新增 `any`。
