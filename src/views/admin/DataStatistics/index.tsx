import AdminPageHeader from '@/views/admin/_common/AdminPageHeader';
import styles from '../style.module.less';

function DataStatistics() {
  return (
    <div className={styles.pageContainer}>
      <AdminPageHeader page="statistics" />
    </div>
  );
}

export default DataStatistics;
