import { Outlet } from 'react-router-dom';

import styles from './AppPageLayout.module.less';

export function AppScrollablePageLayout() {
  return (
    <div className={styles.root}>
      <Outlet />
    </div>
  );
}

export function AppFixedPageLayout() {
  return (
    <div className={`${styles.root} ${styles.fixed}`}>
      <Outlet />
    </div>
  );
}
