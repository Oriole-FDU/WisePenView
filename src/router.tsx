import { lazy } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';

// 引入布局（保持同步加载，保证首屏壳子稳定）
import SystemLayout from '@/layouts/SystemLayout';
import AuthLayout from '@/layouts/AuthLayout';

// 页面使用 lazy load，按路由切分 chunk
const Home = lazy(() => import('@/views/home'));
const Drive = lazy(() => import('@/views/drive/Drive'));
const DrivePreview = lazy(() => import('@/views/drive/DrivePreview'));
const MyGroup = lazy(() => import('@/views/group/MyGroup'));
const GroupDetail = lazy(() => import('@/views/group/GroupDetail'));
const Account = lazy(() => import('@/views/profile/Account'));
const Usage = lazy(() => import('@/views/profile/Usage'));
const Login = lazy(() => import('@/views/auth/Login'));
const Register = lazy(() => import('@/views/auth/Register'));
const ResetPassword = lazy(() => import('@/views/auth/ResetPassword'));
const NewPassword = lazy(() => import('@/views/auth/NewPassword'));
const VerifyEmail = lazy(() => import('@/views/auth/VerifyEmail'));
const Editor = lazy(() => import('@/views/editor/Editor'));

const router = createBrowserRouter([
  // ==============================
  // 外部门户区域
  // ==============================
  {
    path: '/',
    element: <Home />, // 你的独立门户首页
  },
  {
    path: '/login',
    element: <AuthLayout />,
    children: [
      {
        index: true,
        element: <Login />,
      },
    ],
  },
  {
    path: '/register',
    element: <AuthLayout />,
    children: [
      {
        index: true,
        element: <Register />,
      },
    ],
  },
  {
    path: '/reset-pwd',
    element: <AuthLayout />,
    children: [
      {
        index: true,
        element: <ResetPassword />,
      },
    ],
  },
  {
    path: '/new-pwd',
    element: <AuthLayout />,
    children: [
      {
        index: true,
        element: <NewPassword />,
      },
    ],
  },
  {
    path: '/verify-email',
    element: <AuthLayout />,
    children: [
      {
        index: true,
        element: <VerifyEmail />,
      },
    ],
  },

  // ==============================
  // 内部系统区域
  // ==============================
  {
    path: '/app',
    element: <SystemLayout />, // 承载：左侧导航 + 右侧助手 + 中间内容
    children: [
      // 默认重定向到文档列表
      {
        index: true,
        element: <Navigate to="/app/drive" replace />,
      },
      {
        path: 'editor',
        element: <Editor />,
      },
      // 文档与云盘页
      {
        path: 'drive',
        element: <Drive />,
      },
      {
        path: 'preview/drive',
        element: <DrivePreview />,
      },
      {
        path: 'my-group',
        element: <MyGroup />,
      },
      {
        path: 'my-group/:id',
        element: <GroupDetail />,
      },
      {
        path: 'profile/usage',
        element: <Usage />,
      },
      {
        path: 'profile/account',
        element: <Account />,
      },
      // 权限配置预览（界面保留，需要时取消注释）
      // {
      //   path: 'permission-preview',
      //   element: <PermissionConfigPreview />,
      // },
      //   // 具体文档编辑页 (例如 /app/editor/123)
      //   {
      //     path: 'editor/:id',
      //     element: <Editor />,
      //   }
    ],
  },

  // ==============================
  // 兜底
  // ==============================
  {
    path: '*',
    element: <div>404 Not Found</div>,
  },
]);

export default router;
