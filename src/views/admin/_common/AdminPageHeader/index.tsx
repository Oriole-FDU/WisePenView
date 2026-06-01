import styles from './style.module.less';

interface AdminPageHeaderProps {
  title: string;
  subtitle: string;
}

function AdminPageHeader({ title, subtitle }: AdminPageHeaderProps) {
  return (
    <div className={styles.pageHeader}>
      <h1 className={styles.pageTitle}>{title}</h1>
      <span className={styles.pageSubtitle}>{subtitle}</span>
    </div>
  );
}

export default AdminPageHeader;
