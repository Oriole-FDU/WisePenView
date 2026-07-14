import { lazy } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';

// Layout imports
import AdminLayout from '@/layouts/Admin/AdminLayout';
import AppLayout from '@/layouts/App/AppLayout';
import AppNavigationLayout from '@/layouts/AppNavigation/AppNavigationLayout';
import AuthLayout from '@/layouts/Auth/AuthLayout';
import HomeLayout from '@/layouts/Home/HomeLayout';
import WorkspaceLayout from '@/layouts/Workspace/WorkspaceLayout';
import AdminRouteGuard from '@/views/admin/guard/AdminRouteGuard';

// 页面使用 lazy load，按路由切分 chunk
const UserManagement = lazy(() => import('@/views/admin/UserManagement'));
const ResourceManagement = lazy(() => import('@/views/admin/ResourceManagement'));
const GroupManagement = lazy(() => import('@/views/admin/GroupManagement'));
const AnnouncementManagement = lazy(() => import('@/views/admin/AnnouncementManagement'));
const DataStatistics = lazy(() => import('@/views/admin/DataStatistics'));
const PermissionManagement = lazy(() => import('@/views/admin/PermissionManagement'));
const SystemSettings = lazy(() => import('@/views/admin/SystemSettings'));
const LogAudit = lazy(() => import('@/views/admin/LogAudit'));
const TaskCenter = lazy(() => import('@/views/admin/TaskCenter'));
const Home = lazy(() => import('@/views/app/home'));
const Drive = lazy(() => import('@/views/app/drive/Drive'));
const MyGroup = lazy(() => import('@/views/app/group/MyGroup'));
const GroupDetail = lazy(() => import('@/views/app/group/GroupDetail'));
const Account = lazy(() => import('@/views/app/profile/Account'));
const Usage = lazy(() => import('@/views/app/profile/Usage'));
const Appearance = lazy(() => import('@/views/app/profile/Appearance'));
const Login = lazy(() => import('@/views/app/auth/Login'));
const Register = lazy(() => import('@/views/app/auth/Register'));
const ResetPassword = lazy(() => import('@/views/app/auth/ResetPassword'));
const NewPassword = lazy(() => import('@/views/app/auth/NewPassword'));
const VerifyEmail = lazy(() => import('@/views/app/auth/VerifyEmail'));
const WorkspaceResourceView = lazy(() => import('@/views/workspace/WorkspaceResourceView'));
const ZenModeLayout = lazy(() => import('@/layouts/ZenMode/ZenModeLayout'));
const ChatPage = lazy(() => import('@/views/app/chat'));
const ResourceNotFound = lazy(() => import('@/views/app/error/ResourceNotFound'));
const AppError = lazy(() => import('@/views/app/error/AppError'));

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
    element: <AppNavigationLayout />,
    errorElement: <AppError />,
    children: [
      {
        element: <AppLayout />, // 承载：普通 app 页面导航 + 右侧助手 + 中间内容
        children: [
          // 登录后的默认入口为 AI 对话。
          {
            index: true,
            element: <Navigate to="/app/chat" replace />,
          },
          {
            path: 'chat',
            element: <ChatPage />,
          },
          {
            path: 'chat/:sessionId',
            element: <ChatPage />,
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
            path: 'profile/appearance',
            element: <Appearance />,
          },
        ],
      },
      {
        element: <WorkspaceLayout />,
        children: [
          {
            path: 'workspace/:resourceType',
            element: <WorkspaceResourceView />,
          },
          {
            path: 'workspace/:resourceType/:resourceId',
            element: <WorkspaceResourceView />,
          },
        ],
      },
      {
        path: 'zen',
        element: <ZenModeLayout />,
      },
    ],
  },

  // ==============================
  // 管理后台区域
  // ==============================
  {
    path: '/admin',
    element: <AdminRouteGuard />,
    errorElement: <AppError />,
    children: [
      {
        element: <AdminLayout />, // 承载：admin 根页面内容
        children: [
          {
            index: true,
            element: <Navigate to="/admin/users" replace />,
          },
          {
            path: 'users',
            element: <UserManagement />,
          },
          {
            path: 'resources',
            element: <ResourceManagement />,
          },
          {
            path: 'groups',
            element: <GroupManagement />,
          },
          {
            path: 'announcements',
            element: <AnnouncementManagement />,
          },
          {
            path: 'statistics',
            element: <DataStatistics />,
          },
          {
            path: 'permissions',
            element: <PermissionManagement />,
          },
          {
            path: 'settings',
            element: <SystemSettings />,
          },
          {
            path: 'logs',
            element: <LogAudit />,
          },
          {
            path: 'tasks',
            element: <TaskCenter />,
          },
        ],
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
