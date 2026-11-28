import { useTranslation } from 'react-i18next';

import { WorkspacePanel } from '@/components/business/WorkspacePanel';

import styles from '../ResourceInlineCommentPanel.module.scss';
import type { ResourceInlineCommentPanelProps } from './index.type';

function ResourceInlineCommentPanel({ children, onClose }: ResourceInlineCommentPanelProps) {
  const { t } = useTranslation('resource');

  return (
    <WorkspacePanel
      className={styles.panel}
      title={t('sidePanel.annotation')}
      closeLabel={t('sidePanel.collapseAnnotation')}
      onClose={onClose}
    >
      {children}
    </WorkspacePanel>
  );
}

export default ResourceInlineCommentPanel;
