# 可定位版本的错误上报

前端沿用 `reportError` → OTel，以 `error.id`、`wisepen.release_id`、时间及必要的 API 路径追查非预期故障。`service.version` 保留软件包版本，release 额外包含 commit 与每次构建的 UUID。

## 启用与数据边界

Jenkins 的 `ENABLE_OTEL` 维持默认关闭；手动开启后，OTLP 入口使用 API 地址下的 `/otel`。未配置 endpoint 或 mock 模式时不注册 provider。初始化、reporter 同步抛错或异步失败均不得阻断原本操作。

应用错误只传固定分类、错误码、操作名称、安全堆栈位置、规范化页面、必要 HTTP 技术字段、构建识别及暂时 session。原始 message、server message、cause、组件堆栈原文、请求参数、文件、对话与附件内容均不发送。

自动 fetch／XHR 只采集已配置的 API origins。API 路径白名单直接列出本次试点的固定端点，包括 Note 标题实际使用的 `/resource/item/renameResource`；未知或动态路径改记为 `/:endpoint`，query、hash 与 URL 账号密码不保留。页面只保留既有 route contract 中的固定前缀，其余部分改记为 `:id`。

同一 fingerprint 每 60 秒最多上报一次，每页执行实例每分钟最多 20 条；log 与 span 共用判定。一般 API trace 不套用这个应用错误限流。发送维持最佳努力，不新增本地持久化或另一套重试。

## 已接入的失败边界

| 流程         | 回报位置                                                      | 保留的行为                                          |
| ------------ | ------------------------------------------------------------- | --------------------------------------------------- |
| 全局与 React | 既有 root、route、layout、window error 与 unhandled rejection | 原有错误页与重试                                    |
| 登录         | `useApi` 的 opt-in 错误 callback                              | 原有提示与自定义 callback；密码错误及账号锁定不上报 |
| 列表         | 首次加载及加载更多的实际 catch                                | 保留已加载结果，不上报资源或文件夹 ID               |
| Skill／Agent | 保存 request 的失败 callback                                  | 保留草稿、queue 与重试                              |
| Note         | 标题同步 rejection                                            | 正文等待同步不视为终止失败                          |
| Draw.io      | 保存 session 的明确失败及 iframe error                        | dispose、权限与尚未 ready 的前置拒绝不当作保存故障  |
| Office       | SDK 明确错误 callback                                         | 不推论后端持久化是否完成                            |
| Chat         | 建会话、送出、串流及重连失败                                  | 取消／AbortError 不当作应用错误，原本提示仍保留     |

HTTP 5xx 在重试结束后进入同一出口；后续 `WisePenError.cause` 共用编号与短时间去重，避免再制造一条应用错误。一般 toast 不新增编号；既有错误页复制详情包含版本、commit、release 与 dirty 标记。

HTTP 原始异常保留固定的 `AxiosError` 分类；API 响应契约无效（错误码 16）显示对应的中英文提示，不降级为未知错误。没有明确分类或信息的异常仍保留通用提示，不猜测原因或上传原始内容。

## 构建附件与还原

每次 build 使用同一份构建信息写入 bundle、`dist/build-info.json`、发布 manifest 及 `.wisepen-debug/<release>/manifest.json`。本地未提交修改以 `dirty: true` 明示，不能把此产物视为纯 commit 的内容。

Vite 产生 hidden source map 后，将 `.map` 移出公开目录，并将对应 JS 副本放入独立的调试附件。附件记录 JS／map 的 SHA-256。公开发布清单及 OSS 发布拒绝 `.map`；容器亦检查静态目录不含 `.map`。GitHub CI 仍只上传公开 `dist`，Jenkins 额外归档调试附件。

`.wisepen-debug` 是本机构建缓存，每次 build 会重建。从 Jenkins 下载的历史附件应另存文件夹，不要放回此缓存目录。

从事件的 `error.stack` 选取安全堆栈位置，提供完整 release 与该次附件目录：

```sh
node scripts/symbolicate-error.mjs \
  --artifacts /path/to/downloaded-release \
  --release '<事件的 wisepen.release_id>' \
  --frame 'assets/index-xxxxxxxx.js:1:12345'
```

工具使用 Node 原生 `SourceMap`，输出 commit、原始文件、从 1 起算的行列及可取得的名称。不匹配 release、缺文件、路径越界、哈希错误、超出 bundle 范围或没有映射时皆以非零状态结束，不查找 latest 或改用其他版本。

## 正式启用前核对

- 确认 `/otel/v1/logs` 与 `/otel/v1/traces` 的接收、访问限制及 CORS；本次离线检查不能代替接收端验收。
- 确认 Jenkins 调试附件有访问权限控制，不能公开提供源代码。
- 由观测保存端确认错误数据保留 30 天；此仓库无法配置或证明下游 TTL。
- 确认 Jenkins 附件至少保留 90 天，并保留在用及可回退版本对应的 build。本次不新增历史构建自动清理。
- 完成候选版验收后，再由部署者明确开启 `ENABLE_OTEL`。

## 验证与限制

`pnpm check:error-reporting` 使用 Node assert 和既有 esbuild，检查所有已定义前端错误码的中英文文案、真实 AxiosError 分类、编号、白名单、callback、限流、保存失败、附件隔离与 minified fixture 行号还原。构建检查直接读取 Vite 配置；SDK 装配的 API origin、URL 去敏及临时 session 检查使用受控替身，UI hooks 也使用替身。

补充验证已在 Node 隔离环境使用真实 SDK 和本机 OTLP/HTTP 接收器，核对 logs／traces 导出、错误编号、trace 关联及敏感内容排除；只替换运行配置并提供最小浏览器 API 注册入口。这不证明浏览器 fetch／XHR、CORS 或正式接收端行为，它们仍待运行态验收。

没有原始堆栈或有效位置时，只回报可用的版本及事件信息。非对象异常的身份缓存只保留最近 128 个值，同值可共用编号。去重、限流或发送失败时，个别编号可能没有远端事件，须搭配 release 与时间追查。

Note 正文缺少持久化 ACK，Office 前端也未提供后端回写终态；本次不以等待、断线或 modified 状态自行推论保存成败。Electron、真实浏览器、第三方编辑服务、正式接收端及保留政策均须另行验收。
