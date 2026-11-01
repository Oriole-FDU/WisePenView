# Agent 默认值与草稿保存语义提案（T11）

> **只读分析，等待确认，不是已批准契约。** 本文交付 T11，不实现 T12，也不授权 H05 原子保存改造。实施前须确认第六节的语义和范围。
>
> 对照日期：2026-11-01（Asia/Shanghai）。这是版本化证据与决策输入，不是新增的业务规则事实源；确认后的长期规则应归回现有 Agent domain／编辑器的 `BUSINESS.md`。

## 一、源码基线与证据

| 仓库            | 读取版本                                           | 工作区限制                                                           |
| --------------- | -------------------------------------------------- | -------------------------------------------------------------------- |
| WisePenView     | `efdf062c0ec913ba74e5c8c498d644737f159827`，1.1.59 | 从包含已合并 PR #547 的 `origin/main` 新建文档分支；开始时工作区干净 |
| WisePenCloud    | `ba6de69f57b4e83b47ffc20fc06a7e051ca870c2`         | 本地源码只读；无关 `.idea/compiler.xml` 改动未使用、未修改           |
| WisePenCloud-AI | `597fddf08c7f35a425b56715be9f36d72d073433`         | 本地源码只读；无关未跟踪文件未使用、未修改                           |

后端版本是本地 checkout，不代表线上部署版本，也未拉取后端远程来宣称它是最新版本。以下来源核对为相应 HEAD 的已跟踪内容，链接固定 commit。

| 来源 | 路径与行号                                                                                                                                                                                                                                                                                                                                                                          | 证明范围                                         |
| ---- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| F1   | [`src/domains/Agent/apis/AgentApi.schema.ts:16–84`](https://github.com/Oriole-FDU/WisePenView/blob/efdf062c0ec913ba74e5c8c498d644737f159827/src/domains/Agent/apis/AgentApi.schema.ts#L16-L84)                                                                                                                                                                                      | 响应／请求必填 nullable；更新命令另见 128–132 行 |
| F2   | [`src/domains/Agent/mapper/AgentServices.map.ts:19–124`](https://github.com/Oriole-FDU/WisePenView/blob/efdf062c0ec913ba74e5c8c498d644737f159827/src/domains/Agent/mapper/AgentServices.map.ts#L19-L124)                                                                                                                                                                            | 默认值、读取映射和完整保存映射                   |
| F3   | [`src/domains/Agent/mapper/AgentServices.map.ts:139–160`](https://github.com/Oriole-FDU/WisePenView/blob/efdf062c0ec913ba74e5c8c498d644737f159827/src/domains/Agent/mapper/AgentServices.map.ts#L139-L160)                                                                                                                                                                          | 无 bundle 也生成 spec                            |
| F4   | [`src/domains/Agent/service/AgentServices.impl.ts:22–39`](https://github.com/Oriole-FDU/WisePenView/blob/efdf062c0ec913ba74e5c8c498d644737f159827/src/domains/Agent/service/AgentServices.impl.ts#L22-L39)                                                                                                                                                                          | 普通详情不取 bundle；两个并发写请求              |
| F5   | [`src/components/editors/agent/controllers/useAgentVersionController.ts:22–41`](https://github.com/Oriole-FDU/WisePenView/blob/efdf062c0ec913ba74e5c8c498d644737f159827/src/components/editors/agent/controllers/useAgentVersionController.ts#L22-L41)                                                                                                                              | owner 补取草稿；非 owner 使用普通详情            |
| F6   | [`src/components/editors/agent/components/AgentWorkspace/controllers/useAgentDraftSessionController.ts:40–93`](https://github.com/Oriole-FDU/WisePenView/blob/efdf062c0ec913ba74e5c8c498d644737f159827/src/components/editors/agent/components/AgentWorkspace/controllers/useAgentDraftSessionController.ts#L40-L93)                                                                | 引导提示词初始化、dirty 与完整保存               |
| F7   | [`src/components/editors/agent/components/AgentEditor/sections/CapabilitiesSection/index.tsx:18–67`](https://github.com/Oriole-FDU/WisePenView/blob/efdf062c0ec913ba74e5c8c498d644737f159827/src/components/editors/agent/components/AgentEditor/sections/CapabilitiesSection/index.tsx#L18-L67)                                                                                    | 工具覆盖编辑保留另一类布尔值                     |
| F8   | [`src/components/editors/agent/components/AgentEditor/config/agentPresets.ts:1–16`](https://github.com/Oriole-FDU/WisePenView/blob/efdf062c0ec913ba74e5c8c498d644737f159827/src/components/editors/agent/components/AgentEditor/config/agentPresets.ts#L1-L16)                                                                                                                      | 产品推荐记忆预设                                 |
| F9   | [`src/components/editors/agent/components/AgentEditor/sections/MemorySection/index.tsx:22–39`](https://github.com/Oriole-FDU/WisePenView/blob/efdf062c0ec913ba74e5c8c498d644737f159827/src/components/editors/agent/components/AgentEditor/sections/MemorySection/index.tsx#L22-L39)                                                                                                | 恢复推荐设置是显式用户操作                       |
| F10  | [`src/components/editors/agent/model.ts:26–38`](https://github.com/Oriole-FDU/WisePenView/blob/efdf062c0ec913ba74e5c8c498d644737f159827/src/components/editors/agent/model.ts#L26-L38)                                                                                                                                                                                              | dirty 快照来自映射后的 spec                      |
| J1   | [`wisepen-ai-asset-service/wisepen-ai-asset-api/src/main/java/com/oriole/wisepen/ai/asset/domain/base/AgentSpecInfoBase.java:15–64`](https://github.com/Oriole-FDU/WisePenCloud/blob/ba6de69f57b4e83b47ffc20fc06a7e051ca870c2/wisepen-ai-asset-service/wisepen-ai-asset-api/src/main/java/com/oriole/wisepen/ai/asset/domain/base/AgentSpecInfoBase.java#L15-L64)                   | 无字段初值的包装类型、Map 与 Set                 |
| J2   | [`wisepen-ai-asset-service/wisepen-ai-asset-biz/src/main/java/com/oriole/wisepen/ai/asset/service/impl/AgentVersionServiceImpl.java:31–51`](https://github.com/Oriole-FDU/WisePenCloud/blob/ba6de69f57b4e83b47ffc20fc06a7e051ca870c2/wisepen-ai-asset-service/wisepen-ai-asset-biz/src/main/java/com/oriole/wisepen/ai/asset/service/impl/AgentVersionServiceImpl.java#L31-L51)     | 新草稿不填 spec；更新整体替换后保存              |
| J3   | [`wisepen-ai-asset-service/wisepen-ai-asset-api/src/main/java/com/oriole/wisepen/ai/asset/domain/dto/req/AgentSpecUpdateRequest.java:16–23`](https://github.com/Oriole-FDU/WisePenCloud/blob/ba6de69f57b4e83b47ffc20fc06a7e051ca870c2/wisepen-ai-asset-service/wisepen-ai-asset-api/src/main/java/com/oriole/wisepen/ai/asset/domain/dto/req/AgentSpecUpdateRequest.java#L16-L23)   | 顶层 spec 必填                                   |
| J4   | [`wisepen-ai-asset-service/wisepen-ai-asset-biz/src/main/java/com/oriole/wisepen/ai/asset/controller/AgentController.java:143–174`](https://github.com/Oriole-FDU/WisePenCloud/blob/ba6de69f57b4e83b47ffc20fc06a7e051ca870c2/wisepen-ai-asset-service/wisepen-ai-asset-biz/src/main/java/com/oriole/wisepen/ai/asset/controller/AgentController.java#L143-L174)                     | 完整替换、owner 权限和版本包响应复制             |
| J5   | [`wisepen-ai-asset-service/wisepen-ai-asset-biz/src/main/java/com/oriole/wisepen/ai/asset/domain/entity/AgentVersionBundleEntity.java:14–30`](https://github.com/Oriole-FDU/WisePenCloud/blob/ba6de69f57b4e83b47ffc20fc06a7e051ca870c2/wisepen-ai-asset-service/wisepen-ai-asset-biz/src/main/java/com/oriole/wisepen/ai/asset/domain/entity/AgentVersionBundleEntity.java#L14-L30) | Mongo 实体和发布时的提示词检查                   |
| P1   | [`services/wisepen-chat-service/src/chat/application/agents/models.py:6–175`](https://github.com/Oriole-FDU/WisePenCloud-AI/blob/597fddf08c7f35a425b56715be9f36d72d073433/services/wisepen-chat-service/src/chat/application/agents/models.py#L6-L175)                                                                                                                              | 自定义 Agent 默认值、约束及归一化                |
| P2   | [`services/wisepen-chat-service/src/chat/application/agents/default_agent.py:27–61`](https://github.com/Oriole-FDU/WisePenCloud-AI/blob/597fddf08c7f35a425b56715be9f36d72d073433/services/wisepen-chat-service/src/chat/application/agents/default_agent.py#L27-L61)                                                                                                                | 系统默认 Agent 单独从 settings 构建              |
| P3   | [`services/wisepen-chat-service/src/chat/core/config/app_settings.py:83–97`](https://github.com/Oriole-FDU/WisePenCloud-AI/blob/597fddf08c7f35a425b56715be9f36d72d073433/services/wisepen-chat-service/src/chat/core/config/app_settings.py#L83-L97)                                                                                                                                | 水位与长期记忆源码默认；Top-K 另见 128–131 行    |
| P4   | [`services/wisepen-chat-service/src/chat/application/chat_context_assembler.py:106–119`](https://github.com/Oriole-FDU/WisePenCloud-AI/blob/597fddf08c7f35a425b56715be9f36d72d073433/services/wisepen-chat-service/src/chat/application/chat_context_assembler.py#L106-L119)                                                                                                        | 水位在消费端继承 settings                        |
| P5   | [`services/wisepen-chat-service/src/chat/application/chat_turn_tool_policy.py:48–108`](https://github.com/Oriole-FDU/WisePenCloud-AI/blob/597fddf08c7f35a425b56715be9f36d72d073433/services/wisepen-chat-service/src/chat/application/chat_turn_tool_policy.py#L48-L108)                                                                                                            | 请求级 Skill／工具配置覆盖 Agent 配置            |
| P6   | [`services/wisepen-chat-service/src/chat/application/tools/core/registry.py:155–176`](https://github.com/Oriole-FDU/WisePenCloud-AI/blob/597fddf08c7f35a425b56715be9f36d72d073433/services/wisepen-chat-service/src/chat/application/tools/core/registry.py#L155-L176)                                                                                                              | 工具过滤与 CONTEXTUAL／普通工具选择差异          |
| P7   | [`services/wisepen-chat-service/src/chat/application/tools/skill_tools/utils/skill_matcher.py:40–66`](https://github.com/Oriole-FDU/WisePenCloud-AI/blob/597fddf08c7f35a425b56715be9f36d72d073433/services/wisepen-chat-service/src/chat/application/tools/skill_tools/utils/skill_matcher.py#L40-L66)                                                                              | 内置候选、Top-K=0 回退 settings 且至少取 1       |
| P8   | [`services/wisepen-chat-service/src/chat/application/chat_turn_finalizer.py:260–269`](https://github.com/Oriole-FDU/WisePenCloud-AI/blob/597fddf08c7f35a425b56715be9f36d72d073433/services/wisepen-chat-service/src/chat/application/chat_turn_finalizer.py#L260-L269)                                                                                                              | summaryPrompt 空字符串和 None 均用内置提示词     |
| P9   | [`services/wisepen-chat-service/src/chat/application/agents/resolver.py:26–50`](https://github.com/Oriole-FDU/WisePenCloud-AI/blob/597fddf08c7f35a425b56715be9f36d72d073433/services/wisepen-chat-service/src/chat/application/agents/resolver.py#L26-L50)                                                                                                                          | 远程 Agent 只接受已发布且非空提示词的版本        |

## 二、先区分三种状态

1. **bundle 未加载**：`getAgentDetail(resourceId)` 只读主档；mapper 却调用 `mapSpec(undefined)`，生成全量可保存的值（F3/F4）。这不是服务端已确认“全部继承”。
2. **bundle 已加载，spec／策略字段为 null 或省略**：Java 无字段初值，新草稿可以没有 spec，内部字段没有逐项非空约束（J1–J3）。Python 按各字段规则解释 omitted/null（P1），但前端当前仅接受必填 nullable（F1）。
3. **已加载的显式配置**：包括 `false`、`0`、空字符串／对象／数组；不能一概折算为未设置，应按字段与消费端解释（P1/P5/P7/P8）。

**不能扩大结论：** owner 编辑器先取主档，再按 `draftVersion` 补取草稿 bundle，失败会使该次 load 失败，不在这段代码中静默使用基础详情完成首次加载（F5）。非 owner 不补取。bundle 接口要求 owner（J4），因此不能让所有普通详情自动补取 bundle。问题是公共详情抹掉加载状态、已加载 nullable 配置丢失继承意图，不是“owner 总在编辑未加载的草稿”。

### Java null／omitted 的证据边界

- 包装类型没有字段 presence 标记，请求省略子字段与传 null 都落为 Java null。更新是 `setSpec(req.getSpec())` 后保存整个草稿，不是 PATCH（J1/J2/J4）：**省略子字段不表示保留旧值**。
- 更新的顶层 `spec` 有 `@NotNull`，不能用 `spec: null` 清空；初建草稿实体则可能没有 spec（J2/J3）。不能混淆读侧空值与写约束。
- 未连接数据库，不断言 Mongo BSON 是否保留 null 键；未取真实 HTTP 样本，不断言部署环境返回 null 还是 omitted。是否放宽前端 optional 需生产者样本确认，不能从 Java 可空直接推导 wire shape。

## 三、字段对照表

Java 列共用 J1–J4：子字段省略／null 不补默认，整体替换也不保留旧字段。Python 列针对**远程自定义 Agent 的 `from_response`**，非系统默认 Agent。前端列针对已加载全继承配置；保存列指仅改名称等无关字段后完整保存（F2/F6），不是说打开页面必然发请求。

| 字段                                           | Java null／omitted     | Python 生效规则（P1，另注消费端）                                                     | 前端初始显示（F2）                                     | 当前保存 payload（F2/F6）              |
| ---------------------------------------------- | ---------------------- | ------------------------------------------------------------------------------------- | ------------------------------------------------------ | -------------------------------------- |
| `systemPrompt`                                 | 可空；发布须非空（J5） | `""`；远程 resolver 要求非空（P9）                                                    | `""`；owner 空提示词草稿注入引导提示词并标 dirty（F6） | 完整字符串；可连同引导提示词保存       |
| `autoGenerateTitle`                            | null                   | `true`                                                                                | `true`                                                 | 显式 `true`                            |
| `modelPolicy.defaultModelId/defaultProviderId` | null                   | `None`                                                                                | `""`                                                   | 显式空字符串                           |
| `modelPolicy.allowRequestOverride`             | null                   | `true`                                                                                | `true`                                                 | 显式 `true`                            |
| `toolAndSkillPolicy.enableUseTool`             | null                   | `true`；false 时关闭 Skill、清 overrides                                              | `true`                                                 | 显式 `true`，不做 Python 归一化        |
| `toolSelectionDefaultEnabled`                  | null                   | `true`；工具禁用时变 false                                                            | `true`                                                 | 显式 `true`                            |
| `toolSelectionOverrides`                       | null                   | `{}`；工具禁用时清空；请求值可整体覆盖（P5）                                          | `{}`                                                   | 显式 `{}`；已有 true/false 键保留      |
| `enableUseSkill`                               | null                   | `true`；受总工具开关约束                                                              | `true`                                                 | 显式 `true`                            |
| `onDemandSkillIds`                             | null                   | `None`；显式 `[]` 为 `set()`；当前候选链均折算空集合并加入始终可用内置 Skill（P5/P7） | `[]`                                                   | 显式 `[]`                              |
| `skillMatchTopK`                               | null                   | **20**；模型允许 0–29；0 在 matcher 中回退 settings 且至少取 1（P7）                  | **10**                                                 | 显式 **10**，改变有效行为              |
| `memoryPolicy.enableChatMemory`                | null                   | `true`；false 禁用持久化／压缩，但不自动禁用长期记忆                                  | `true`                                                 | 显式 `true`；不联动归一化              |
| `enablePersistenceChatMemory`                  | null                   | `true`，受 Chat Memory 约束                                                           | `true`                                                 | 显式 `true`                            |
| `enableChatMemorySummary`                      | null                   | `true`，受 Chat Memory 约束                                                           | `true`                                                 | 显式 `true`                            |
| `highWatermarkRatio/lowWatermarkRatio`         | null                   | 解析为 `None`；消费继承 settings，源码默认 **0.8/0.5**（P3/P4）                       | 常量 **0.8/0.5**                                       | 显式 **0.8/0.5**，冻结可随部署变化的值 |
| `summaryPrompt`                                | null                   | `None`；显式 `""` 也使用内置提示词（P8）                                              | `""`                                                   | 显式 `""`                              |
| `enableLongTermMemory`                         | null                   | **true**                                                                              | **false**                                              | 显式 **false**，改变有效行为           |
| `longTermMemoryLimit`                          | null                   | **10**；长期记忆禁用时变 `None`                                                       | **10**                                                 | 显式 **10**，开关关闭也保留            |
| `longTermMemoryScoreThreshold`                 | null                   | **0.6**；长期记忆禁用时变 `None`                                                      | **0.6**                                                | 显式 **0.6**，开关关闭也保留           |

### 不能简化成“把 10 改成 20”

- 自定义 Agent 的 Top-K 缺省是解析器中的 20；系统默认 Agent 则由 `settings.SKILL_MATCH_TOP_K` 构建，源码默认也为 20，但部署可变（P1/P2/P3），不是永久同一来源。
- 水位数字碰巧相同仍不等于语义相同：null 继承与保存常量生命周期不同。推荐预设是产品选择（F8），恢复按钮是显式应用（F9），不能让普通读取／无关保存隐式应用。
- Python 限定水位 `0 < ratio <= 1`、Top-K `0 <= k < 30`、长期条数非负、分数 0–1；前端只检查基础 number/int（F1/P1）。Python **未校验低水位小于高水位**，不能将合理建议写成已实现契约。
- 工具 overrides 的“无键／true／false”有别。请求 `{}` 替换而非合并 Agent overrides；CONTEXTUAL 工具仅 false 可显式排除，普通工具遵循默认开关与 override；都仍受目录可用性等过滤，true 不绕过权限或配置（P5/P6）。
- Python 开关归一化只作用运行态对象，没有证据表明回写 Java；不能为显示有效值而删除关闭状态下已保存的参数／overrides。

## 四、最小问题链

```text
已加载 bundle，memoryPolicy = null，toolAndSkillPolicy = null
  → Python：长期记忆 true、Top-K 20、水位继承 settings
  → 前端 mapSpec：长期记忆 false、Top-K 10、水位常量 0.8/0.5
  → 仅改名称，或初始化空提示词后保存
  → mapAgentSpecToApi 输出完整 spec
  → Java 整体替换草稿 spec
  → 后续发布并加载该远程 Agent 时，长期记忆 false、Top-K 10 生效
```

证明的是保存改变配置、后续加载改变行为，不是草稿保存立即影响已发布版本；远程 resolver 只接受已发布版本（P9），T11 不重新设计草稿调试。

dirty 快照来自映射后的 spec，已不包含原 nullable 意图（F6/F10）。两个 `Promise.all` 写请求可能部分成功（F4），属于 H05，不能假装调整前端请求顺序就实现原子保存。

## 五、推荐语义（尚未批准）

1. **保存配置与显示投影分离。** 领域读模型保留继承意图；控件布尔／数字不作为持久化事实源，不直接把 API DTO 泄漏给组件。
2. **未加载不可保存。** 普通主档不生成伪完整 spec；版本详情才生成编辑草稿。保留 owner 补取权限边界，不要求非 owner 拉 owner-only bundle。
3. **无关编辑不固化继承。** 改名称等操作保留未触碰策略的 null／继承状态。整体替换仍发送完整保存配置，不能只发 dirty 字段作为伪 PATCH。
4. **显式编辑才物化。** null 策略中编辑一个字段，兄弟字段仍继承；恢复推荐设置才应用产品预设，不称其为服务器默认。
5. **开关不销毁保存配置。** UI 显示依赖关系，但关闭后重新开启保留参数／overrides；不反向保存 Python 归一化结果。
6. **不伪造部署有效值。** 无有效配置查询契约时，水位显示继承状态，不宣称部署必为 0.8/0.5；若要求准确有效值，先确认生产者契约，不再建一份前端硬编码 owner。

## 六、需要用户／后端确认

| 编号 | 决策                                                             | 推荐与影响                                                                                | 状态   |
| ---- | ---------------------------------------------------------------- | ----------------------------------------------------------------------------------------- | ------ |
| Q1   | null 是继承还是新建时固化？10／长期记忆关闭是否为刻意产品默认？  | 保留继承，不批量覆盖显式 10/false；新 Agent 产品预设另设显式入口                          | 未确认 |
| Q2   | 真实 wire 总返回 nullable 键吗？历史 omitted／空 spec 如何编码？ | 提供 Java 原始响应、历史样本、update/read-back；有证据才增加相关 optional，不全域放宽     | 未确认 |
| Q3   | 同意三种加载／继承状态与保存／显示分离吗？                       | 确认后才改公共类型与编辑器状态；核对全部调用者，不强制非 owner 取 bundle                  | 未确认 |
| Q4   | null 策略编辑单字段，恢复继承／推荐设置如何操作？                | 兄弟字段保留继承；恢复继承写 null；推荐预设是显式配置。新增开关／文案需产品确认           | 未确认 |
| Q5   | Top-K=0、范围与水位关系的长期语义？                              | 暂保留 0 的真实回退；确认后对齐 Java/Python/前端，不擅改为禁用 Skill 或加 low < high 门禁 | 未确认 |
| Q6   | 关闭工具／记忆是否保留隐藏参数？请求 `{}` 继续替换吗？           | 保留保存配置，运行态归一化；不在 T12 顺手改变请求级行为                                   | 未确认 |
| Q7   | T12 仅修前端意图，原子保存留 H05？                               | 分开推进；部分失败与并发版本控制不在本提案中解决                                          | 未确认 |

**T12 尚未实现就绪。** 本文档 PR 审阅通过不自动表示 Q1–Q7 均获批准。须明确记录接受的语义、排除项和样本范围；后端事项未确认时单列阻塞。

## 七、最小前端修改清单与拆分

仅估算，不是本 PR 实际修改，也不要求一次改完超过 6 个非机械文件。实施前重新 `rg` 核对类型传播。

- **A：无损领域读写。** `src/domains/Agent/entity/agent.ts`、`service/index.type.ts`、`service/AgentServices.impl.ts`、`mapper/AgentServices.map.ts`：保留加载／继承状态，完整替换不从显示默认值生成。先选主档／版本详情边界；不猜新 endpoint。与 B 组成可交付垂直修改，中间破坏类型的状态不单独合并。
- **B：草稿与显示。** `src/components/editors/agent/model.ts`、`controllers/useAgentVersionController.ts`、`components/AgentWorkspace/controllers/useAgentDraftSessionController.ts` 和实际触及的 `AgentEditor` section：dirty 基于保存配置，控件编辑才物化。section 多时按模型／能力／记忆继续拆；超过约 6 个非机械文件先说明范围。空提示词引导不擅改。
- **C：条件 Schema 切片。** Q2/Q5 确认后才改 `src/domains/Agent/apis/AgentApi.schema.ts`，同步 `mock/AgentApi.mock.ts` 的真实样本和更新行为。不放宽全部字段掩盖未知 wire，不默认新增逐域常驻测试。
- **长期规则。** 已确认且实施的领域语义归 `src/domains/Agent/BUSINESS.md`，交互归 `src/components/editors/agent/BUSINESS.md`；本文不取代既有 owner，不将推测记为业务事实。

## 八、验证与交接

本 PR 只改 Markdown，不改业务代码、Schema 或后端，不新增常驻测试。

- 源码核对：三个 HEAD、来源文件与 HEAD 内容一致、链接行号、owner 补取路径、Java 完整替换与顶层 spec 非空约束。
- 一次性前端样本（Node.js 22.23.2 + esbuild，6 组通过）：nullable/omitted 与顶层 spec；10/false/水位显示；无关保存固化继承；显式 false/0/工具覆盖；前端接受 Python 拒绝的数值；未加载／null／全继承映射不可区分。临时 bundle 已删除。
- 一次性 Python 样本（本地 venv，仅导入已跟踪 `models.py`，8 组通过）：null/omitted 默认；Chat Memory 依赖；关闭后的归一化；工具联动；false/0；None／空 Skill 集合；数值拒绝；未校验 low < high。未启动服务；解释器提示相对路径形式的 venv prefix warning，不影响断言结果。
- 文档检查：`git diff --check`、来源路径／行号／链接锚点检查；提交钩子执行 Markdown 格式化与 commitlint。本地被忽略 TODO 另做文本差异核对，不把空 Git diff 当检查结果。
- 推送钩子实际执行 `pnpm run lint`、`pnpm typecheck`，均通过；未运行 build（纯 Markdown 不要求）。未复用前项结果冒充本次执行。
- 未验证：真实 Java HTTP null/omitted、Mongo 读回、线上 settings、浏览器、草稿调试／发布回放、部分成功／并发；未启动 dev/mock、未连接生产。
- 交接：T11 分析完成，T12 待确认；忽略的本地 TODO 仅更新 T11。下一步先确认 Q1–Q7 并提供必要样本，再确定 T12 批准切片；其他 T/H 项未推进。
