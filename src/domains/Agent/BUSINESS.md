# Agent 领域业务知识

## 范围

本文件拥有 Agent 资源、版本数据、Spec 与资产 service 契约。编辑工作区、草稿保存与发布互动由 [Agent editor workflow](../../components/editors/agent/BUSINESS.md) 拥有。

## 规则

- Agent 以 Resource ID 作为资源识别；详情合并 Resource 信息与 Agent 版本 bundle。已发布版本取自 Agent 信息的 `agentInfo.version`，默认草稿版本为 `publishedVersion + 1`；若请求指定正版本，bundle 提供该版本的状态、Spec 与资产。依据：[AgentServices](service/AgentServices.impl.ts) 的 `getAgentDetail`、[AgentServicesMap](mapper/AgentServices.map.ts) 的 `mapAgentDetail`、[Agent entity](entity/agent.ts) 的 `AgentDetail`。
- `AgentSpec` 包含 system prompt、模型策略、Tool／Skill 策略与记忆策略；mapper 对缺少的 Spec 或策略字段套用前端默认值，并非严格验证所有必要字段。默认值不是后端已保存设置的证明。依据：[AgentServicesMap](mapper/AgentServices.map.ts) 的 `mapSpec`、`AGENT_SPEC_FALLBACK`、[Agent API type](apis/AgentApi.type.ts) 的 `AgentSpecApi`。
- 保存草稿通过两个请求分别更新 Agent 基本资料的 `name`／`description` 与指定 draft version 的 Spec，service 使用 `Promise.all`；两者不是原子事务，部分成功可能留待重新读取确认。依据：[AgentServices](service/AgentServices.impl.ts) 的 `saveAgentDraft`、[AgentServicesMap](mapper/AgentServices.map.ts) 的 `mapSaveAgentDraftRequests`。
- Agent asset 使用版本资产上传流程；文件扩展名映射为 MD、Python、JSON、YAML、TOML，其余映射为 TEXT。上传、取消与删除都带 resource ID 及 draft version；PUT 失败时以 ticket 的 assetId／objectKey 双识别取消候选，不删除既有资产，取消失败也不覆盖原上传错误。依据：[AgentServices](service/AgentServices.impl.ts) 的 `uploadAsset`、`deleteAssets`、[AgentServicesMap](mapper/AgentServices.map.ts) 的 `resolveAssetResourceType`、[Agent API type](apis/AgentApi.type.ts) 的 `AgentAssetResourceTypeApiValue`。

## 尚未由前端证明的事项

前端将 Resource owner 信息映射到 Agent，并送出版本／Spec／asset 请求；实际读写权限、发布者资格、版本不可变性及 asset 保存行为仍由后端契约决定，不能仅凭 UI 状态推论。
