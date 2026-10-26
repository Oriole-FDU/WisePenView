# Domain Mapping 规范

Mapping 负责在协议类型与前端稳定业务类型之间做必要转换。Mapper 是按需存在的边界，不是每个领域都必须创建的一层；请求和响应结构与 service 契约一致时，应直接传递已通过 API Schema 校验的数据。

## 一、职责

Mapper 或 service 边界应处理：

- 后端 DTO 到 entity/view model 的转换。
- service 请求参数到 API request 的转换。
- fallback 和协议兼容。
- ID 归一化，例如使用 `normalizeId` 处理数字 ID 或大整数 ID。
- 时间、枚举、权限动作、状态值等展示前归一化。
- 后端大小写不一致、字段缺失、字段别名兼容等问题。

Mapper 不应处理：

- 发请求。
- UI 提示。
- React 状态。
- store 写入。
- 跨 service 编排。

## 二、按需使用 Mapper

满足以下条件时不单独创建 mapper：

- API request 与 service request 的字段和语义一致。
- API response 已被 Zod Schema 校验，并且 service 可以直接消费其稳定字段。
- 不存在字段改名、枚举转换、ID 归一化、时间格式化或协议兼容。

出现上述映射需求时再创建 mapper。只有一处调用的业务归一化也可以留在 service；当同一转换被多个流程复用，或兼容规则需要独立审查时，再抽成纯函数或 mapper。不要为了维持目录形状保留只做逐字段复制的 `mapXxx`。

## 三、fallback 原则

- fallback 必须有明确原因，通常是协议兼容、灰度字段或历史数据。
- fallback 逻辑集中写在 mapper，不要散落在 JSX、service 或组件内部。
- 对非显而易见的 fallback 写中文注释，说明兼容哪个后端形态。
- 不要为了掩盖边界不清楚而写大量 `?.`、默认值或类型守卫。边界不清楚时先问。

示例场景：

- 后端同时返回 `tokenLimit` 和 `TokenLimit`。
- 枚举可能返回数字、数字字符串或枚举名。
- 配置接口可能省略 `groupId`，需要使用请求入参兜底。

## 四、类型边界

- Mapper 输入类型贴近 API response。
- Mapper 输出类型贴近 `entity` 或 service 的业务返回类型；无需 mapper 时，由 API Schema 校验后直接进入 service。
- API response 的 envelope 已由 `src/apis/request.ts` 校验；mapper 只处理 DTO payload 的可选字段、历史字段和领域归一化，不重复解包响应 envelope。
- DTO 已声明的可选／可空字段应先由 API Schema 校验；需要兼容或归一化时，再在 mapper 或 service 边界处理，避免后端字段异常直接泄漏到 entity 或 view。
- 不要在组件中重复定义与领域实体相同语义的类型。
- 不要把后端 raw DTO 直接作为组件 Props。

## 五、命名建议

常见文件：

```text
src/domains/<Domain>/mapper/<Domain>Services.map.ts
src/domains/<Domain>/mapper/<entity>.mapper.ts
```

常见函数命名：

- `mapXxxRequest`
- `mapXxxFromApi`
- `mapXxxToApi`
- `normalizeXxx`

## 六、检查清单

- [ ] 存在真实字段转换时才创建 mapper，没有保留机械复制的映射函数。
- [ ] fallback 有明确业务或兼容原因。
- [ ] ID、时间、枚举在 mapper 或明确的 service 业务边界中归一化。
- [ ] 组件没有直接消费后端 raw DTO。
- [ ] service 中没有堆叠大量字段兼容逻辑。
- [ ] mapper 输入使用明确 API DTO，不接收未分层的 `unknown` 响应。
- [ ] 未新增 `any`。
