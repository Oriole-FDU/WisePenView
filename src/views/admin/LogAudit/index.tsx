import AdminPageHeader from '@/views/admin/_common/AdminPageHeader';
import { ADMIN_PAGE_CONFIGS } from '@/views/admin/pages';
import styles from '../style.module.less';

function LogAudit() {
  const page = ADMIN_PAGE_CONFIGS.logs;

  return (
    <div className={styles.pageContainer}>
      <AdminPageHeader title={page.title} subtitle={page.subtitle} />
    </div>
  );
}

export default LogAudit;
