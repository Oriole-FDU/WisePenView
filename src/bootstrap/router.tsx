import { lazy } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';

// 引入布局（保持同步加载，保证首屏壳子稳定�?
import AuthLayout from '@/layouts/AuthLayout';
import HomeLayout from '@/layouts/HomeLayout';
import SystemLayout from '@/layouts/SystemLayout';

// 页面使用 lazy load，按路由切分 chunk
const Home = lazy(() => import('@/views/home'));
const Drive = lazy(() => import('@/views/drive/Drive'));
const MyGroup = lazy(() => import('@/views/group/MyGroup'));
const GroupDetail = lazy(() => import('@/views/group/GroupDetail'));
const Account = lazy(() => import('@/views/profile/Account'));
const Usage = lazy(() => import('@/views/profile/Usage'));
const Login = lazy(() => import('@/views/auth/Login'));
const Register = lazy(() => import('@/views/auth/Register'));
const ResetPassword = lazy(() => import('@/views/auth/ResetPassword'));
const NewPassword = lazy(() => import('@/views/auth/NewPassword'));
const VerifyEmail = lazy(() => import('@/views/auth/VerifyEmail'));
const NoteView = lazy(() => import('@/views/note'));
const PdfPreview = lazy(() => import('@/views/pdf/PdfPreview'));
const ResourceNotFound = lazy(() => import('@/views/error/ResourceNotFound'));
const ChatPage = lazy(() => import('@/views/chat'));
const AppError = lazy(() => import('@/views/error/AppError'));

const router = createBrowserRouter([
  // ==============================
  // 外部门户区域
  // ==============================
  {
    path: '/',
    element: <HomeLayout />,
    errorElement: <AppError />,
    children: [
      {
        index: true,
        element: <Home />,
      },
    ],
  },
  {
    path: '/login',
    element: <AuthLayout />,
    errorElement: <AppError />,
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
    errorElement: <AppError />,
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
    errorElement: <AppError />,
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
    errorElement: <AppError />,
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
    errorElement: <AppError />,
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
    element: <SystemLayout />, // 承载：左侧导�?+ 右侧助手 + 中间内容
    errorElement: <AppError />,
    children: [
      // 默认重定向到文档列表
      {
        index: true,
        element: <Navigate to="/app/drive" replace />,
      },
      {
        path: 'note',
        element: <NoteView />,
      },
      {
        path: 'chat',
        element: <ChatPage />,
      },
      {
        path: 'chat/:sessionId',
        element: <ChatPage />,
      },
      {
        path: 'note/:noteId',
        element: <NoteView />,
      },
      // 文档与云盘页
      {
        path: 'drive',
        element: <Drive />,
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
      {
        path: 'pdf/:resourceId',
        element: <PdfPreview />,
      },
    ],
  },

  // ==============================
  // 兜底
  // ==============================
  {
    path: '*',
    element: <ResourceNotFound />,
  },
]);

export default router;
