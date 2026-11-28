import { Outlet } from 'react-router-dom';

import RouteOutletBoundary from '@/layouts/RouteOutletBoundary';

import styles from './_common/style.module.scss';
import CourseNavigationSidebar from './_parts/CourseNavigationSidebar';

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
