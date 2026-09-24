# Domain Mapper 规范

Mapper 层负责把后端协议数据转换为前端展示和 service 编排真正关心的类型。凡是字段兼容、fallback、归一化，都应集中在 mapper。

## 一、职责

Mapper 应处理：

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

## 二、fallback 原则

- fallback 必须有明确原因，通常是协议兼容、灰度字段或历史数据。
- fallback 逻辑集中写在 mapper，不要散落在 JSX、service 或组件内部。
- 对非显而易见的 fallback 写中文注释，说明兼容哪个后端形态。
- 不要为了掩盖边界不清楚而写大量 `?.`、默认值或类型守卫。边界不清楚时先问。

示例场景：

- 后端同时返回 `tokenLimit` 和 `TokenLimit`。
- 枚举可能返回数字、数字字符串或枚举名。
- 配置接口可能省略 `groupId`，需要使用请求入参兜底。

## 三、类型边界

- Mapper 输入类型贴近 API response。
- Mapper 输出类型贴近 `entity` 或 service 的业务返回类型。
- 不要在组件中重复定义与领域实体相同语义的类型。
- 不要把后端 raw DTO 直接作为组件 Props。

## 四、命名建议

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

## 五、检查清单

- [ ] 字段转换集中在 mapper。
- [ ] fallback 有明确业务或兼容原因。
- [ ] ID、时间、枚举在 mapper 中归一化。
- [ ] 组件没有直接消费后端 raw DTO。
- [ ] service 中没有堆叠大量字段兼容逻辑。
- [ ] 未新增 `any`。
