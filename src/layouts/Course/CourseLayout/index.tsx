import { Outlet } from 'react-router-dom';

import RouteOutletBoundary from '@/layouts/RouteOutletBoundary';

import CourseNavigationSidebar from './CourseNavigationSidebar';
import styles from './style.module.scss';

function CourseLayout() {
  return (
    <div className={styles.root}>
      <CourseNavigationSidebar />
      <main className={styles.main}>
        <div className={styles.content}>
          <RouteOutletBoundary>
            <Outlet />
          </RouteOutletBoundary>
        </div>
      </main>
    </div>
  );
}

export default CourseLayout;
