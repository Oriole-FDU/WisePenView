---
name: wisepen-ci-failure
description: 定位 WisePenView GitHub Actions 的 lint、typecheck、mock contract、build 或 commitlint 失败。
---

# 处理 CI 失败

## 执行步骤

1. 确认失败 workflow、job、commit SHA 和失败步骤，先读取完整错误而不是猜测。
2. 判断失败属于代码、依赖锁文件、Node/pnpm 环境、环境变量、workflow 配置还是外部服务。
3. 在同一 commit 或 PR 分支尽可能复现；静态检查优先使用本地命令，不启动运行态服务。
4. 只修复导致失败的根因，避免顺手升级依赖、格式化无关文件或放宽规则。
5. 运行对应验证并记录命令、结果和与远端环境的差异。
6. 用户授权后提交和 push；如果是 GitHub 配置或密钥问题，输出管理员操作清单。

## 完成标准

- CI 错误有可验证的根因分类。
- 修复后的检查覆盖原失败步骤。
- 外部环境问题没有被伪装成代码已修复。
