import { useTranslation } from 'react-i18next';

import PageHeader from '@/components/base/PageHeader';

import styles from './_common/style.module.scss';
import ModelSettingsSection from './_parts/ModelSettingsSection';
import ProviderSettingsSection from './_parts/ProviderSettingsSection';
import WebSearchSettingsSection from './_parts/WebSearchSettingsSection';

function AISettings() {
  const { t } = useTranslation('profile');

  return (
    <>
      <PageHeader title={t('ai.title')} />
      <div className={styles.page}>
        <ProviderSettingsSection />
        <ModelSettingsSection />
        <WebSearchSettingsSection />
      </div>
    </>
  );
}

export default AISettings;
