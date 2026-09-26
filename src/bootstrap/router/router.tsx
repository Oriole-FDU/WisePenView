import { lazy } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';

import type { AppRouteHandle } from '@/bootstrap/router/routeHandle';
import { APP_SIDEBAR_HEADER_NAV_KEY } from '@/config/appSidebar';
import AdminLayout from '@/layouts/AdminLayout';
import { AppAuthProvider } from '@/layouts/App/_context';
import { AppFixedPageLayout, AppScrollablePageLayout } from '@/layouts/App/AppPageLayout';
import AppLayout from '@/layouts/AppLayout';
import AppNavigationLayout from '@/layouts/AppNavigation/AppNavigationLayout';
import AuthLayout from '@/layouts/Auth/AuthLayout';
import CourseLayout from '@/layouts/Course/CourseLayout';
import CourseLearningLayout from '@/layouts/Course/CourseLearningLayout';
import ResourceHost from '@/layouts/Resource/ResourceHost';
import { APP_ROUTE_PATH } from '@/utils/navigation/appRoute';
import AdminRouteGuard from '@/views/admin/guard/AdminRouteGuard';
import AppError from '@/views/app/error/AppError';
import ResourceNotFound from '@/views/app/error/ResourceNotFound';
import RouteError from '@/views/app/error/RouteError';
import ScopedRouteNotFound from '@/views/app/error/ScopedRouteNotFound';
import AnonymousGuardPage from '@/views/app/guard/AnonymousGuardPage';
import AuthenticatedRouteGuard from '@/views/app/guard/AuthenticatedRouteGuard';

const UserManagement = lazy(() => import('@/views/admin/UserManagement'));
const ResourceManagement = lazy(() => import('@/views/admin/ResourceManagement'));
const GroupManagement = lazy(() => import('@/views/admin/GroupManagement'));
const AnnouncementManagement = lazy(() => import('@/views/admin/AnnouncementManagement'));
const DataStatistics = lazy(() => import('@/views/admin/DataStatistics'));
const PermissionManagement = lazy(() => import('@/views/admin/PermissionManagement'));
const SystemSettings = lazy(() => import('@/views/admin/SystemSettings'));
const LogAudit = lazy(() => import('@/views/admin/LogAudit'));
const TaskCenter = lazy(() => import('@/views/admin/TaskCenter'));
const Drive = lazy(() => import('@/views/app/drive/Drive'));
const PublicGroupsPage = lazy(() => import('@/views/app/public/PublicGroupsPage'));
const PublicCoursesPage = lazy(() => import('@/views/app/public/PublicCoursesPage'));
const PublicInvitePage = lazy(() => import('@/views/app/public/Invite'));
const GroupDetail = lazy(() => import('@/views/app/group/GroupDetail'));
const GroupRoute = lazy(() => import('@/views/app/group/GroupRoute'));
const GroupFilesPage = lazy(() => import('@/views/app/group/GroupDetail/_pages/GroupFilesPage'));
const GroupMembersPage = lazy(
  () => import('@/views/app/group/GroupDetail/_pages/GroupMembersPage')
);
const GroupWalletPage = lazy(() => import('@/views/app/group/GroupDetail/_pages/GroupWalletPage'));
const GroupTokenTransferPage = lazy(
  () => import('@/views/app/group/GroupDetail/_pages/GroupTokenTransferPage')
);
const GroupSettingsPage = lazy(
  () => import('@/views/app/group/GroupDetail/_pages/GroupSettingsPage')
);
const GroupWalletRouteGuard = lazy(
  () => import('@/views/app/group/GroupDetail/_guards/GroupWalletRouteGuard')
);
const Account = lazy(() => import('@/views/app/profile/Account'));
const Usage = lazy(() => import('@/views/app/profile/Usage'));
const Appearance = lazy(() => import('@/views/app/profile/Appearance'));
const AISettings = lazy(() => import('@/views/app/profile/AI'));
const Login = lazy(() => import('@/views/app/auth/Login'));
const Register = lazy(() => import('@/views/app/auth/Register'));
const AuthBindingOnboarding = lazy(() => import('@/views/app/auth/AuthBindingOnboarding'));
const ResetPassword = lazy(() => import('@/views/app/auth/ResetPassword'));
const NewPassword = lazy(() => import('@/views/app/auth/NewPassword'));
const VerifyEmail = lazy(() => import('@/views/app/auth/VerifyEmail'));
const ResourceRouteView = lazy(() => import('@/views/resource/ResourceRouteView'));
const ChatPage = lazy(() => import('@/views/app/chat'));
const NotificationsPage = lazy(() => import('@/views/app/notifications'));
const CourseRoute = lazy(() => import('@/views/app/course/CourseRoute'));
const CourseContextPage = lazy(() => import('@/views/app/course/CourseContextPage'));
const CourseHomePage = lazy(
  () => import('@/views/app/course/CourseContextPage/_components/CourseHomeTab')
);
const CourseInfoPage = lazy(
  () => import('@/views/app/course/CourseContextPage/_components/CourseInfoTab')
);
const CourseMaterialsPage = lazy(() => import('@/views/app/course/CourseMaterialsPage'));
const CourseMembersPage = lazy(() => import('@/views/app/course/CourseMembersPage'));
const CourseEditorPage = lazy(() => import('@/views/app/course/CourseEditorPage'));
const CourseSettingsRouteGuard = lazy(
  () => import('@/views/app/course/_guards/CourseSettingsRouteGuard')
);
const RootRouteGuard = lazy(() => import('@/views/app/guard/RootRouteGuard'));

const chatRouteHandle = {
  appSidebar: { selectedHeaderNavKey: APP_SIDEBAR_HEADER_NAV_KEY.CHAT },
} satisfies AppRouteHandle;
const notificationRouteHandle = {
  appSidebar: { selectedHeaderNavKey: APP_SIDEBAR_HEADER_NAV_KEY.NOTIFICATIONS },
} satisfies AppRouteHandle;
const driveRouteHandle = {
  appSidebar: { selectedHeaderNavKey: APP_SIDEBAR_HEADER_NAV_KEY.DRIVE },
} satisfies AppRouteHandle;
const publicRouteHandle = {
  appSidebar: { selectedHeaderNavKey: APP_SIDEBAR_HEADER_NAV_KEY.PUBLIC },
} satisfies AppRouteHandle;
const noSidebarSelectionRouteHandle = {
  appSidebar: { selectedHeaderNavKey: null },
} satisfies AppRouteHandle;

const router = createBrowserRouter([
  {
    element: <AuthLayout />,
    errorElement: <AppError />,
    children: [
      { path: 'login', element: <Login /> },
      { path: 'register', element: <Register /> },
      { path: 'onboarding/bind', element: <AuthBindingOnboarding /> },
      { path: 'password/forgot', element: <ResetPassword /> },
      { path: 'password/reset', element: <NewPassword /> },
      { path: 'email/verify', element: <VerifyEmail /> },
    ],
  },
  {
    path: APP_ROUTE_PATH.HOME,
    element: <RootRouteGuard />,
    errorElement: <AppError />,
  },
  {
    path: APP_ROUTE_PATH.ANONYMOUS,
    element: (
      <AppAuthProvider mode="anonymous">
        <AppNavigationLayout />
      </AppAuthProvider>
    ),
    errorElement: <AppError />,
    children: [
      {
        element: <AppLayout />,
        errorElement: <RouteError />,
        children: [
          {
            index: true,
            element: <AnonymousGuardPage />,
            handle: chatRouteHandle,
          },
        ],
      },
    ],
  },
  {
    element: <AuthenticatedRouteGuard />,
    errorElement: <AppError />,
    children: [
      {
        element: (
          <AppAuthProvider mode="authenticated">
            <AppNavigationLayout />
          </AppAuthProvider>
        ),
        children: [
          {
            element: <AppLayout />,
            errorElement: <RouteError />,
            children: [
              { path: 'chat/:sessionId?', element: <ChatPage />, handle: chatRouteHandle },
              {
                element: <AppScrollablePageLayout />,
                children: [
                  {
                    path: 'notifications',
                    element: <NotificationsPage />,
                    handle: notificationRouteHandle,
                  },
                  {
                    path: 'notifications/:messageId',
                    element: <NotificationsPage />,
                    handle: notificationRouteHandle,
                  },
                  {
                    path: 'invite',
                    element: <PublicInvitePage />,
                    handle: publicRouteHandle,
                  },
                  {
                    path: 'groups',
                    element: <PublicGroupsPage />,
                    handle: publicRouteHandle,
                  },
                  {
                    path: 'courses',
                    element: <PublicCoursesPage />,
                    handle: publicRouteHandle,
                  },
                  {
                    path: 'profile/usage',
                    element: <Usage />,
                    handle: noSidebarSelectionRouteHandle,
                  },
                  {
                    path: 'profile/account',
                    element: <Account />,
                    handle: noSidebarSelectionRouteHandle,
                  },
                  {
                    path: 'profile/appearance',
                    element: <Appearance />,
                    handle: noSidebarSelectionRouteHandle,
                  },
                  {
                    path: 'profile/ai',
                    element: <AISettings />,
                    handle: noSidebarSelectionRouteHandle,
                  },
                ],
              },
              { path: 'drive', element: <Navigate to={APP_ROUTE_PATH.DRIVE_PERSONAL} replace /> },
              {
                element: <AppFixedPageLayout />,
                children: [
                  {
                    path: 'drive/personal',
                    element: <Drive />,
                    handle: driveRouteHandle,
                  },
                  {
                    path: 'drive/personal/folder/:folderId',
                    element: <Drive />,
                    handle: driveRouteHandle,
                  },
                  {
                    path: 'drive/upload-queue',
                    element: <Drive viewMode="uploadQueue" />,
                    handle: driveRouteHandle,
                  },
                  {
                    path: 'drive/favorites',
                    element: <Drive viewMode="favorites" />,
                    handle: driveRouteHandle,
                  },
                  {
                    path: 'drive/trash',
                    element: <Drive viewMode="trash" />,
                    handle: driveRouteHandle,
                  },
                  {
                    path: 'drive/trash/folder/:folderId',
                    element: <Drive viewMode="trash" />,
                    handle: driveRouteHandle,
                  },
                  {
                    path: 'groups/:groupId',
                    element: <GroupRoute />,
                    children: [
                      { index: true, element: <Navigate to="files" replace /> },
                      {
                        element: <GroupDetail />,
                        children: [
                          {
                            path: 'files',
                            element: <GroupFilesPage />,
                            handle: publicRouteHandle,
                          },
                          {
                            path: 'files/folder/:folderId',
                            element: <GroupFilesPage />,
                            handle: publicRouteHandle,
                          },
                          {
                            path: 'members',
                            element: <GroupMembersPage />,
                            handle: publicRouteHandle,
                          },
                          {
                            element: <GroupWalletRouteGuard />,
                            children: [
                              {
                                path: 'wallet',
                                element: <GroupWalletPage />,
                                handle: publicRouteHandle,
                              },
                              {
                                path: 'token-transfer',
                                element: <GroupTokenTransferPage />,
                                handle: publicRouteHandle,
                              },
                            ],
                          },
                          {
                            path: 'settings',
                            element: <GroupSettingsPage />,
                            handle: publicRouteHandle,
                          },
                        ],
                      },
                    ],
                  },
                ],
              },
              {
                path: 'resources/:resourceType/:resourceId',
                element: <ResourceHost />,
                children: [
                  {
                    index: true,
                    element: <ResourceRouteView />,
                    handle: driveRouteHandle,
                  },
                ],
              },
              {
                path: 'courses/:courseId',
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
                        element: <CourseContextPage />,
                        children: [
                          {
                            path: 'home',
                            element: <CourseHomePage />,
                            handle: publicRouteHandle,
                          },
                          {
                            path: 'info',
                            element: <CourseInfoPage />,
                            handle: publicRouteHandle,
                          },
                        ],
                      },
                      {
                        path: 'materials',
                        element: <CourseMaterialsPage />,
                        handle: publicRouteHandle,
                      },
                      {
                        path: 'members',
                        element: <CourseMembersPage />,
                        handle: publicRouteHandle,
                      },
                    ],
                  },
                  {
                    path: 'learning/:outlineNodeId?',
                    element: <CourseLearningLayout />,
                    handle: publicRouteHandle,
                  },
                  {
                    element: <CourseSettingsRouteGuard />,
                    children: [
                      {
                        path: 'settings',
                        element: <CourseEditorPage />,
                        handle: publicRouteHandle,
                      },
                    ],
                  },
                ],
              },
              {
                path: 'profile',
                element: <Navigate to={APP_ROUTE_PATH.PROFILE_ACCOUNT} replace />,
              },
            ],
          },
        ],
      },
    ],
  },
  {
    path: APP_ROUTE_PATH.ADMIN,
    element: <AdminRouteGuard />,
    errorElement: <AppError />,
    children: [
      {
        element: <AdminLayout />,
        errorElement: <RouteError />,
        children: [
          { index: true, element: <Navigate to={APP_ROUTE_PATH.ADMIN_USERS} replace /> },
          { path: 'users', element: <UserManagement /> },
          { path: 'resources', element: <ResourceManagement /> },
          { path: 'groups', element: <GroupManagement /> },
          { path: 'announcements', element: <AnnouncementManagement /> },
          { path: 'statistics', element: <DataStatistics /> },
          { path: 'permissions', element: <PermissionManagement /> },
          { path: 'settings', element: <SystemSettings /> },
          { path: 'logs', element: <LogAudit /> },
          { path: 'tasks', element: <TaskCenter /> },
        ],
      },
      {
        path: '*',
        element: (
          <ScopedRouteNotFound
            homePath={APP_ROUTE_PATH.ADMIN_USERS}
            homeLabelKey="page.backAdmin"
          />
        ),
      },
    ],
  },
  {
    path: '*',
    element: <ResourceNotFound />,
  },
]);

export default router;
