import AdminPageHeader from '@/views/admin/_common/AdminPageHeader';
import styles from '../style.module.less';

function ResourceManagement() {
  return (
    <div className={styles.pageContainer}>
      <AdminPageHeader page="resources" />
    </div>
  );
}

export default ResourceManagement;
