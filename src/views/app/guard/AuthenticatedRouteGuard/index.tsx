import { Navigate, Outlet } from 'react-router-dom';

import { buildLoginPathForCurrentLocation } from '@/bootstrap/authContinuation';
import { Spin } from '@/components/base/Feedback';
import { useUserService } from '@/domains';
import { useApi } from '@/hooks/useApi';
import { observeUserLoad } from '@/observability';

import styles from './style.module.scss';

function AuthenticatedRouteGuard() {
  const userService = useUserService();
  const { data, error, loading } = useApi(() => observeUserLoad(() => userService.getUserInfo()));

  if (loading || (!data && !error)) {
    return (
      <div className={styles.state}>
        <Spin size="large" />
      </div>
    );
  }

  if (error || !data) {
    return <Navigate to={buildLoginPathForCurrentLocation()} replace />;
  }

  return <Outlet />;
}

export default AuthenticatedRouteGuard;
