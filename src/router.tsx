import { createBrowserRouter, Navigate } from 'react-router-dom';

// 引入布局
import SystemLayout from '@/layouts/SystemLayout';
import AuthLayout from '@/layouts/AuthLayout';

// 引入页面 (实际开发中建议使用 lazy load)
import Home from '@/views/home';
import DriveList from '@/views/drive';
import MyGroup from '@/views/group/MyGroup';
import GroupDetail from '@/views/group/GroupDetail';
// import PermissionConfigPreview from '@/views/group/PermissionConfigPreview';
import Usage from '@/views/profile/Usage';
import Login from '@/views/auth/Login';
import Register from '@/views/auth/Register';
import ResetPassword from '@/views/auth/ResetPassword';
import NewPassword from '@/views/auth/NewPassword';
// import Editor from '@/views/editor';   // 编辑器页

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
      // 文档与云盘页
      {
        path: 'drive',
        element: <DriveList />,
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
  }
]);

export default router;