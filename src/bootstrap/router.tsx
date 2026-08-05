import { lazy } from 'react';
import { createBrowserRouter, Navigate, Outlet } from 'react-router-dom';

// Layout imports
import AdminLayout from '@/layouts/Admin/AdminLayout';
import AppLayout from '@/layouts/App/AppLayout';
import AppNavigationLayout from '@/layouts/AppNavigation/AppNavigationLayout';
import AuthLayout from '@/layouts/Auth/AuthLayout';
import CourseLayout from '@/layouts/Course/CourseLayout';
import CourseLearningLayout from '@/layouts/Course/CourseLearningLayout';
import HomeLayout from '@/layouts/Home/HomeLayout';
import WorkspaceLayout from '@/layouts/Workspace/WorkspaceLayout';
import AdminRouteGuard from '@/views/admin/guard/AdminRouteGuard';
import RouteError from '@/views/app/error/RouteError';

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
const AuthBindingOnboarding = lazy(() => import('@/views/app/auth/AuthBindingOnboarding'));
const ResetPassword = lazy(() => import('@/views/app/auth/ResetPassword'));
const NewPassword = lazy(() => import('@/views/app/auth/NewPassword'));
const VerifyEmail = lazy(() => import('@/views/app/auth/VerifyEmail'));
const WorkspaceResourceView = lazy(() => import('@/views/workspace/WorkspaceResourceView'));
// Zen Mode 暂不上线，保留实现代码便于后续恢复。
// const ZenModeLayout = lazy(() => import('@/layouts/ZenMode/ZenModeLayout'));
const ChatPage = lazy(() => import('@/views/app/chat'));
const NotificationsPage = lazy(() => import('@/views/app/notifications'));
const ResourceNotFound = lazy(() => import('@/views/app/error/ResourceNotFound'));
const AppError = lazy(() => import('@/views/app/error/AppError'));
const CourseRoute = lazy(() => import('@/views/app/course/CourseRoute'));
const CourseContextPage = lazy(() => import('@/views/app/course/CourseContextPage'));
const CourseAssignmentsPage = lazy(() => import('@/views/app/course/CourseAssignmentsPage'));
const CourseAssignmentDetailPage = lazy(
  () => import('@/views/app/course/CourseAssignmentDetailPage')
);
const CourseMaterialsPage = lazy(() => import('@/views/app/course/CourseMaterialsPage'));
const CourseMembersPage = lazy(() => import('@/views/app/course/CourseMembersPage'));
const CourseAnnouncementsPage = lazy(() => import('@/views/app/course/CourseAnnouncementsPage'));
const CourseEditorPage = lazy(() => import('@/views/app/course/CourseEditorPage'));

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
    path: '/auth/onboarding/bind',
    element: <AuthLayout />,
    errorElement: <AppError />,
    children: [
      {
        index: true,
        element: <AuthBindingOnboarding />,
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
        errorElement: <RouteError />,
        children: [
          {
            element: <Outlet />,
            errorElement: <RouteError />,
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
              {
                path: 'notifications',
                element: <NotificationsPage />,
              },
              {
                path: 'notifications/:messageId',
                element: <NotificationsPage />,
              },
              // 文档与云盘页
              {
                path: 'drive/personal',
                element: <Drive />,
              },
              {
                path: 'drive/personal/folder/:folderId',
                element: <Drive />,
              },
              {
                path: 'drive/group/:groupId',
                element: <Drive />,
              },
              {
                path: 'drive/group/:groupId/folder/:folderId',
                element: <Drive />,
              },
              {
                path: 'drive/upload-queue',
                element: <Drive viewMode="uploadQueue" />,
              },
              {
                path: 'drive/favorites',
                element: <Drive viewMode="favorites" />,
              },
              {
                path: 'drive/trash',
                element: <Drive viewMode="trash" />,
              },
              {
                path: 'drive/trash/folder/:folderId',
                element: <Drive viewMode="trash" />,
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
                path: 'course/:courseId',
                element: <CourseRoute />,
                children: [
                  {
                    element: <CourseLayout />,
                    children: [
                      {
                        index: true,
                        element: <Navigate to="home" replace />,
                      },
                      {
                        path: 'home',
                        element: <CourseContextPage />,
                      },
                      {
                        path: 'assignments',
                        element: <CourseAssignmentsPage />,
                      },
                      {
                        path: 'assignments/:assignmentId',
                        element: <CourseAssignmentDetailPage />,
                      },
                      {
                        path: 'materials',
                        element: <CourseMaterialsPage />,
                      },
                      {
                        path: 'announcements',
                        element: <CourseAnnouncementsPage />,
                      },
                      {
                        path: 'members',
                        element: <CourseMembersPage />,
                      },
                    ],
                  },
                  {
                    path: 'learning/:outlineNodeId?',
                    element: <CourseLearningLayout />,
                  },
                  {
                    path: 'edit',
                    element: <CourseEditorPage />,
                  },
                ],
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
        ],
      },
      {
        element: <WorkspaceLayout />,
        errorElement: <RouteError />,
        children: [
          {
            element: <Outlet />,
            errorElement: <RouteError />,
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
        ],
      },
      // Zen Mode 暂不上线，暂不注册访问路由。
      // {
      //   path: 'zen',
      //   element: <ZenModeLayout />,
      //   errorElement: <RouteError />,
      // },
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
        errorElement: <RouteError />,
        children: [
          {
            element: <Outlet />,
            errorElement: <RouteError />,
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
