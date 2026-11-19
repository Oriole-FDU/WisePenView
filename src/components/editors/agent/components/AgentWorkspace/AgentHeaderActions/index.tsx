import { Upload } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { AppButton } from '@/components/base/Button';
import VersionDropdown from '@/components/business/VersionDropdown';
import type { VersionDropdownItem } from '@/components/business/VersionDropdown/index.type';

import styles from '../../../style.module.scss';

interface AgentHeaderActionsProps {
  disabledVersionKeys: Set<string>;
  publishLoading: boolean;
  versionItems: VersionDropdownItem[];
  versionLoading: boolean;
  viewingVersion: number | null;
  onPublish: () => void;
  onVersionSelect: (version: number) => void;
}

export default function AgentHeaderActions({
  disabledVersionKeys,
  publishLoading,
  versionItems,
  versionLoading,
  viewingVersion,
  onPublish,
  onVersionSelect,
}: AgentHeaderActionsProps) {
  const { t } = useTranslation('agent');

  return (
    <div className={styles.headerActions}>
      <VersionDropdown
        items={versionItems}
        disabledKeys={disabledVersionKeys}
        formatVersion={(version) => `v${version}.0`}
        onSelect={onVersionSelect}
      />
      <AppButton
        variant="primary"
        isDisabled={viewingVersion !== null || publishLoading || versionLoading}
        onPress={onPublish}
      >
        <Upload size={15} />
        {t('agent:page.publishAction')}
      </AppButton>
    </div>
  );
}
