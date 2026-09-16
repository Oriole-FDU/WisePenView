import { useTranslation } from 'react-i18next';

import PageHeader from '@/layouts/_common/PageHeader';

import ModelSettingsSection from './ModelSettingsSection';
import ProviderSettingsSection from './ProviderSettingsSection';
import styles from './style.module.less';
import WebSearchSettingsSection from './WebSearchSettingsSection';

function AISettings() {
  const { t } = useTranslation('profile');

  return (
    <>
      <PageHeader title={t('ai.title')} subtitle={t('ai.subtitle')} />
      <div className={styles.page}>
        <ProviderSettingsSection />
        <ModelSettingsSection />
        <WebSearchSettingsSection />
      </div>
    </>
  );
}

export default AISettings;
