import AdminPageHeader from '@/views/admin/_common/AdminPageHeader';

import styles from '../style.module.scss';

function GroupManagement() {
  return (
    <div className={styles.pageContainer}>
      <AdminPageHeader page="groups" />
    </div>
  );
}

export default GroupManagement;
