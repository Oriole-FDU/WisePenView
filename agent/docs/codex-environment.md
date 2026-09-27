# Codex 项目环境

本仓库不提交项目级 `.codex/config.toml`：当前根入口足够短，专题文档按需读取，不需要扩大常驻上下文。若未来需要共享 Desktop Local Environment，可由 Codex Desktop 生成项目级 `.codex` 文件；项目必须在 Codex 中被信任后，这类配置才会生效。

## Desktop Local Environment

如果团队使用 Codex Desktop，可以为本项目配置并共享以下 setup/action：

### Setup

```bash
corepack pnpm install --frozen-lockfile
```

### Actions

- Lint：`corepack pnpm lint`
- Typecheck：`corepack pnpm typecheck`
- Mock contract：`corepack pnpm check:mock`
- Build：`corepack pnpm build`

不要把启动 `pnpm dev` 或 `pnpm mock` 设置成自动 setup；运行态验证必须由任务明确要求。

## CLI 和 IDE

CLI、IDE 和 Desktop 共享个人 Codex 配置，但 Local Environment action 由 Desktop 提供。其它客户端直接使用 `agent/docs/repo-map.md` 和 `agent/docs/verification.md` 中的命令。

## MCP 与个人设置

OpenAI Docs MCP、默认模型、审批策略、沙箱权限和个人凭据放在 `~/.codex/config.toml` 或组织级配置，不提交到仓库。涉及 Codex 或 OpenAI 产品时优先查询官方文档。
