import AdminPageHeader from '@/views/admin/_common/AdminPageHeader';
import styles from '../style.module.less';

function TaskCenter() {
  return (
    <div className={styles.pageContainer}>
      <AdminPageHeader page="tasks" />
    </div>
  );
}

export default TaskCenter;
