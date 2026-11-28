import { useTranslation } from 'react-i18next';

import { ADMIN_PAGE_CONFIGS } from '@/views/admin/pages';

import type { AdminPageHeaderProps } from './index.type';
import styles from './style.module.scss';

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
