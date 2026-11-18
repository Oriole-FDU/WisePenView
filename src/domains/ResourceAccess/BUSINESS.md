# ResourceAccess 业务知识

> Canonical owner：`src/domains/ResourceAccess`

## 跨服务契约

- 权限更新接口对两种配置采用不同语义。群组覆盖按 groupId 合并，单组 `null` 删除覆盖并恢复继承；指定用户清单整体替换，`null` 清空。因此，某组继承读取失败不要求冻结其他主体，但增删用户必须保留完整的指定用户清单。依据：[WisePenCloud 权限写入实现](https://github.com/Oriole-FDU/WisePenCloud/blob/90ef2684c71e24f12dfa17bd383b5e1c667067e6/wisepen-resource-service/wisepen-resource-biz/src/main/java/com/oriole/wisepen/resource/service/impl/ResourceServiceImpl.java#L408)。

## 集成决策

- Group 与 Tag 的补全查询是缺少统一权限概览接口时的临时集成方式；后端提供稳定的聚合 DTO 后应直接替换，不保留两套读取路径。
