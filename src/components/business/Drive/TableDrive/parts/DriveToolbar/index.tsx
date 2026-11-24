import { PanelRightClose, PanelRightOpen } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { AppButton } from '@/components/base/Button';
import AppIconButton from '@/components/base/Button/AppIconButton';
import { GuideAnchor } from '@/components/base/Guide';
import { GUIDE_TOOL_ID } from '@/constants/tour';

import CreateMenu from '../CreateMenu';
import type { DriveToolbarProps } from './index.type';
import styles from './style.module.scss';

function DriveToolbar({
  showCreateMenu,
  createMenuItems,
  onSelectCreate,
  showUploadToGroup,
  onOpenUploadToGroup,
  detailPanelCollapsed,
  onToggleDetailPanel,
}: DriveToolbarProps) {
  const { t } = useTranslation('drive');

  return (
    <div className={styles.toolbarActions}>
      {showCreateMenu ? <CreateMenu items={createMenuItems} onSelect={onSelectCreate} /> : null}
      {showUploadToGroup ? (
        <AppButton variant="secondary" size="sm" onPress={onOpenUploadToGroup}>
          {t('table.addFromPersonal')}
        </AppButton>
      ) : null}
      <GuideAnchor id={GUIDE_TOOL_ID.driveDetails}>
        <AppIconButton
          icon={
            detailPanelCollapsed ? (
              <PanelRightOpen size={16} aria-hidden="true" />
            ) : (
              <PanelRightClose size={16} aria-hidden="true" />
            )
          }
          label={detailPanelCollapsed ? t('table.expandDetails') : t('table.collapseDetails')}
          size="sm"
          className={styles.detailPanelToggle}
          onPress={onToggleDetailPanel}
        />
      </GuideAnchor>
    </div>
  );
}

export default DriveToolbar;
