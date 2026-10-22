import AdminPageHeader from '@/views/admin/_common/AdminPageHeader';

import styles from '../style.module.scss';

function ResourceManagement() {
  return (
    <div className={styles.pageContainer}>
      <AdminPageHeader page="resources" />
    </div>
  );
}

export default ResourceManagement;
