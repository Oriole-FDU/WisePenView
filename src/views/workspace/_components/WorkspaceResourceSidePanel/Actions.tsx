import AppIconButton from '@/components/Button/AppIconButton';
import { MessageSquareText, MessagesSquare } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useWorkspaceResourceSidePanelStore } from '../../_store/useWorkspaceResourceSidePanelStore';
import styles from './style.module.less';

interface WorkspaceResourceSidePanelActionsProps {
  resourceId: string;
  inlineCommentAvailable: boolean;
  disabled?: boolean;
}

function WorkspaceResourceSidePanelActions({
  resourceId,
  inlineCommentAvailable,
  disabled,
}: WorkspaceResourceSidePanelActionsProps) {
  const { t } = useTranslation('resource');
  const mode = useWorkspaceResourceSidePanelStore(
    (state) => state.modeByResourceId[resourceId] ?? 'closed'
  );
  const toggleMode = useWorkspaceResourceSidePanelStore((state) => state.toggleMode);

  return (
    <div className={styles.actions}>
      {inlineCommentAvailable ? (
        <AppIconButton
          icon={<MessageSquareText size={18} aria-hidden="true" />}
          label={
            mode === 'inlineComment'
              ? t('sidePanel.collapseAnnotation')
              : t('sidePanel.expandAnnotation')
          }
          isActive={mode === 'inlineComment'}
          isDisabled={disabled}
          aria-expanded={mode === 'inlineComment'}
          tooltip={{
            content:
              mode === 'inlineComment'
                ? t('sidePanel.collapseAnnotation')
                : t('sidePanel.openAnnotation'),
          }}
          onPress={() => toggleMode(resourceId, 'inlineComment')}
        />
      ) : null}
      <AppIconButton
        icon={<MessagesSquare size={18} aria-hidden="true" />}
        label={mode === 'comment' ? t('sidePanel.collapseComments') : t('sidePanel.expandComments')}
        isActive={mode === 'comment'}
        isDisabled={disabled}
        aria-expanded={mode === 'comment'}
        tooltip={{
          content:
            mode === 'comment' ? t('sidePanel.collapseComments') : t('sidePanel.openComments'),
        }}
        onPress={() => toggleMode(resourceId, 'comment')}
      />
    </div>
  );
}

export default WorkspaceResourceSidePanelActions;
