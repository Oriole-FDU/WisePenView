# Auth 业务知识

> Canonical owner：`src/domains/Auth`

## 范围

本文档维护注册、登录、密码流程与认证会话事件。会话存储归属、生命周期及清理边界以[工程存储规范](../../../agent/docs/store.md)为准。

## 注册与密码

- 邀请码在链接参数、注册输入与注册请求之间统一去除首尾空格并转为大写；空值不写入注册请求。邀请码仅属于注册参数，登录只发送账号与密码。依据：[normalizeRegisterRequest](utils/normalizeRegisterRequest.ts)、[AuthServices](service/AuthServices.impl.ts)。
- 注册与登录是两个独立请求；注册成功后自动登录属于注册页面的流程编排，不由 Auth service 合并成一个请求。依据：[Register](../../views/app/auth/Register/index.tsx)、[AuthServices](service/AuthServices.impl.ts)。
- 忘记密码按用户名发送重置邮件；重置密码使用邮件 token 和新密码。已登录用户修改密码另需旧密码与新密码。前端表单校验不代表后端校验或邮件送达结果。依据：[Auth API](apis/AuthApi.ts)、[密码请求类型](service/AuthService.type.ts)。

## 会话失效与清理

- Auth service 只在登录或退出登录 API 成功后发布对应事件。应用收到登录事件时清理 service cache 与 session store；收到退出登录或 unauthorized 时，另清理指定的 Skill 草稿与 Note 协作 IndexedDB，并导回登录页。依据：[AuthServices](service/AuthServices.impl.ts)、[App](../../bootstrap/App.tsx)。
- HTTP client 只对请求发出时与当前版本相同的 401 发布 unauthorized；登录请求跳过此处理。较旧会话发出的请求即使后来返回 401，也不会结束新会话。依据：[httpClient](../../apis/_internal/httpClient.ts)、[authSessionCoordinator](../../utils/auth/authSessionCoordinator.ts)。
- coordinator 通过 localStorage 事件通知其他标签页；当前标签直接收到本地事件，其他标签递增会话版本并运行同一清理处理。浏览器不提供 storage 时，广播失败不会阻断认证请求。事件同步不承担业务数据存储。依据：[authSessionCoordinator](../../utils/auth/authSessionCoordinator.ts)、[App](../../bootstrap/App.tsx)。
- 前端事件负责清理与导航，不证明服务端凭证、会话撤销或其他标签页的后端状态；这些行为仍由认证 API 与部署环境决定。
