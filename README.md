# WisePenView

基于 React + Ant Design 的前端项目。

## 快速开始

### 1 安装前置环境（Node.js / Python3）

> 如果你已安装好 Node.js 与 Python3，可跳过这一步。

### 2 项目初始化（依赖安装 + hosts 配置）

- macOS / Linux:
  - `bash scripts/setup.sh`
- Windows:
  - `scripts\setup.bat`

说明：

- 脚本会优先使用 `corepack` 管理 `pnpm`。
- 若本机没有 `corepack`，会交互询问是否允许全局安装 `pnpm`（默认否）。
- `hosts` 写入可能需要管理员权限：
  - macOS / Linux 可使用 `sudo bash scripts/setup.sh`
  - Windows 请以管理员身份运行 `setup.bat`

### 3 启动本地测试

- Mock 模式：
  - `npm run mock`
- 开发模式：
  - `npm run dev`

## 常用命令

- `npm run dev`：启动开发服务器
- `npm run mock`：以 mock 模式启动
- `npm run build`：构建产物
- `npm run lint`：执行 ESLint
