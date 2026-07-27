import AdminPageHeader from '@/views/admin/_common/AdminPageHeader';
import styles from '../style.module.less';

function UserManagement() {
  return (
    <div className={styles.pageContainer}>
      <AdminPageHeader page="users" />
    </div>
  );
}

export default UserManagement;
