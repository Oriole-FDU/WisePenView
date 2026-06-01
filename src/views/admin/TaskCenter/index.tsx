import AdminPageHeader from '@/views/admin/_common/AdminPageHeader';
import { ADMIN_PAGE_CONFIGS } from '@/views/admin/pages';
import styles from '../style.module.less';

function TaskCenter() {
  const page = ADMIN_PAGE_CONFIGS.tasks;

  return (
    <div className={styles.pageContainer}>
      <AdminPageHeader title={page.title} subtitle={page.subtitle} />
    </div>
  );
}

export default TaskCenter;
