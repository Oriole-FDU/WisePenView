import { useRef } from 'react';
import { useTranslation } from 'react-i18next';

import PageHeader from '@/components/base/PageHeader';

import ModelSettingsSection from './ModelSettingsSection';
import ProviderSettingsSection from './ProviderSettingsSection';
import styles from './style.module.scss';
import WebSearchSettingsSection from './WebSearchSettingsSection';

function AISettings() {
  const { t } = useTranslation('profile');
  const modelAddButtonRef = useRef<HTMLButtonElement>(null);
  const requestAddModel = () => modelAddButtonRef.current?.click();

  return (
    <>
      <PageHeader title={t('ai.title')} />
      <div className={styles.page}>
        <ProviderSettingsSection onRequestAddModel={requestAddModel} />
        <ModelSettingsSection addButtonRef={modelAddButtonRef} />
        <WebSearchSettingsSection />
      </div>
    </>
  );
}

export default AISettings;
