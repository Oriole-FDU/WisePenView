import AdminPageHeader from '@/views/admin/_common/AdminPageHeader';
import styles from '../style.module.less';

function PermissionManagement() {
  return (
    <div className={styles.pageContainer}>
      <AdminPageHeader page="permissions" />
    </div>
  );
}

export default PermissionManagement;
