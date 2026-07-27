import AdminPageHeader from '@/views/admin/_common/AdminPageHeader';
import styles from '../style.module.less';

function LogAudit() {
  return (
    <div className={styles.pageContainer}>
      <AdminPageHeader page="logs" />
    </div>
  );
}

export default LogAudit;
