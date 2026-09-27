# 发布工作流

1. 确认版本号变更来自明确的发布任务或已批准 PR。
2. 从 `main` 检查版本号、依赖锁文件、release workflow 和当前标签。
3. 运行 `pnpm lint`、`pnpm typecheck`、`pnpm build`，记录正式环境、Electron 和第三方编辑器未验证项。
4. 发布由 `.github/workflows/release.yml` 根据 `package.json#version` 创建标签和 GitHub Release。
5. 不手工移动已存在的版本标签；不要把发布权限扩散到普通 CI。
