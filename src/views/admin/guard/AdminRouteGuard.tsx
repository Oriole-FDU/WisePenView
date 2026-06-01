import { useUserService } from '@/domains';
import { IDENTITY } from '@/domains/User';
import { useMount, useUpdateEffect } from 'ahooks';
import { Spin } from 'antd';
import { useCallback, useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import styles from './AdminRouteGuard.module.less';

type GuardStatus = 'checking' | 'allowed' | 'denied';

function AdminRouteGuard() {
  const userService = useUserService();
  const location = useLocation();
  const [status, setStatus] = useState<GuardStatus>('checking');

  const checkAdminPermission = useCallback(async () => {
    setStatus('checking');
    try {
      const user = await userService.getUserInfo();
      setStatus(user.identityType === IDENTITY.ADMIN ? 'allowed' : 'denied');
    } catch {
      // 未登录等认证异常交给全局 axios 401 拦截处理，其他异常按非管理员处理。
      setStatus('denied');
    }
  }, [userService]);

  useMount(() => {
    checkAdminPermission();
  });

  useUpdateEffect(() => {
    checkAdminPermission();
  }, [location.pathname, checkAdminPermission]);

  if (status === 'checking') {
    return (
      <div className={styles.loading}>
        <Spin size="large" />
      </div>
    );
  }

  if (status === 'denied') {
    return <Navigate to="/app" replace />;
  }

  return <Outlet />;
}

export default AdminRouteGuard;
