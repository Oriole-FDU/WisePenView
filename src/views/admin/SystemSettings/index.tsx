import AdminPageHeader from '@/views/admin/_common/AdminPageHeader';
import styles from '../style.module.less';

function SystemSettings() {
  return (
    <div className={styles.pageContainer}>
      <AdminPageHeader page="settings" />
    </div>
  );
}

export default SystemSettings;
