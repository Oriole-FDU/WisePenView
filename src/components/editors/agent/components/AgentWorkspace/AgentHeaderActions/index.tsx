import { Save, Upload } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { AppButton } from '@/components/base/Button';
import VersionDropdown from '@/components/business/VersionDropdown';
import type { VersionDropdownItem } from '@/components/business/VersionDropdown/index.type';

import styles from '../../../style.module.less';

interface AgentHeaderActionsProps {
  disabledVersionKeys: Set<string>;
  isDirty: boolean;
  publishLoading: boolean;
  saveLoading: boolean;
  versionItems: VersionDropdownItem[];
  versionLoading: boolean;
  viewingVersion: number | null;
  onPublish: () => void;
  onSave: () => void;
  onVersionSelect: (version: number) => void;
}

export default function AgentHeaderActions({
  disabledVersionKeys,
  isDirty,
  publishLoading,
  saveLoading,
  versionItems,
  versionLoading,
  viewingVersion,
  onPublish,
  onSave,
  onVersionSelect,
}: AgentHeaderActionsProps) {
  const { t } = useTranslation(['agent', 'common']);

  return (
    <div className={styles.headerActions}>
      <AppButton
        variant="secondary"
        isDisabled={viewingVersion !== null || !isDirty || saveLoading || versionLoading}
        onPress={onSave}
      >
        <Save size={15} />
        {t('common:actions.save')}
      </AppButton>
      <VersionDropdown
        items={versionItems}
        disabledKeys={disabledVersionKeys}
        formatVersion={(version) => `v${version}.0`}
        onSelect={onVersionSelect}
      />
      <AppButton
        variant="primary"
        isDisabled={viewingVersion !== null || publishLoading || saveLoading || versionLoading}
        onPress={onPublish}
      >
        <Upload size={15} />
        {t('agent:page.publishAction')}
      </AppButton>
    </div>
  );
}
