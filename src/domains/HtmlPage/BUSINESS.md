# HtmlPage 领域

- 仅负责 AI 生成的单文件 HTML 页面读取，不提供创建、上传、替换或版本切换入口。
- 页面信息来自 `POST /singleHtmlPage/getSingleHtmlPageInfo`；正文来自 `GET /singleHtmlPage/getSingleHtmlPageContent`，后者是裸 `text/html` 响应，不经过 `R<T>` 解包。
- 只有 `currentVersion > 0` 且对应版本状态为 `READY` 时才读取正文；HtmlPage 只向 [ResourceAccess](../ResourceAccess/BUSINESS.md) 提供 info 接口返回的 `resourceInfo`，不自行构造权限概览。
- 正文必须通过 Blob URL 和 `sandbox="allow-scripts"` iframe 渲染，禁止添加 `allow-same-origin`，并由前端注入与后端一致的网络限制 CSP。
- 正文中的 `/singleHtmlPage/assets/...` 是后端资源根路径；Blob 文档需注入 API origin 作为 `<base>`，CSP 仅额外放行该 origin 的样式资源。
