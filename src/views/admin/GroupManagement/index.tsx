import AdminPageHeader from '@/views/admin/_common/AdminPageHeader';
import styles from '../style.module.less';

function GroupManagement() {
  return (
    <div className={styles.pageContainer}>
      <AdminPageHeader page="groups" />
    </div>
  );
}

export default GroupManagement;
