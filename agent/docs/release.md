# 发布与分支

## 分支

- 日常 Bug、功能和重构默认从 `main` 创建符合 `agent/docs/commit.md` 的 `<type>/<topic>` 分支，并提交到 `main` PR。
- `dev` 只有在用户明确说明集成、版本或发布目标时使用。
- 发布版本通过 `package.json#version` 驱动 `.github/workflows/release.yml`；不要手工移动已有版本标签。

## 发布前

- 确认版本号变更和 PR 说明一致。
- 运行 `pnpm lint`、`pnpm typecheck`、`pnpm build`。
- 检查 release workflow 的权限仍只在发布任务使用 `contents: write`。
- 记录未验证的正式后端、Electron、真机或第三方编辑器场景。
