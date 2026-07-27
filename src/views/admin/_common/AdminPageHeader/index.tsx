import { ADMIN_PAGE_CONFIGS, type AdminPageKey } from '@/views/admin/pages';
import { useTranslation } from 'react-i18next';
import styles from './style.module.less';

interface AdminPageHeaderProps {
  page: AdminPageKey;
}

function AdminPageHeader({ page }: AdminPageHeaderProps) {
  const { t } = useTranslation('admin');
  const config = ADMIN_PAGE_CONFIGS[page];

  return (
    <div className={styles.pageHeader}>
      <h1 className={styles.pageTitle}>{t(config.titleKey)}</h1>
      <span className={styles.pageSubtitle}>{t(config.subtitleKey)}</span>
    </div>
  );
}

export default AdminPageHeader;
