import VersionDropdown from '@/components/VersionDropdown';
import type { VersionDropdownItem } from '@/components/VersionDropdown/index.type';
import { Button } from '@heroui/react';
import { Save, Upload } from 'lucide-react';
import { useTranslation } from 'react-i18next';
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
      <Button
        variant="secondary"
        isDisabled={viewingVersion !== null || !isDirty || saveLoading || versionLoading}
        onPress={onSave}
      >
        <Save size={15} />
        {t('common:actions.save')}
      </Button>
      <Button
        variant="primary"
        isDisabled={viewingVersion !== null || publishLoading || saveLoading || versionLoading}
        onPress={onPublish}
      >
        <Upload size={15} />
        {t('agent:page.publishAction')}
      </Button>
      <VersionDropdown
        items={versionItems}
        disabledKeys={disabledVersionKeys}
        formatVersion={(version) => `v${version}.0`}
        onSelect={onVersionSelect}
      />
    </div>
  );
}
