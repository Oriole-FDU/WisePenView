import AppIconButton from '@/components/Button/AppIconButton';
import { MessageSquareText, MessagesSquare } from 'lucide-react';
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
  const mode = useWorkspaceResourceSidePanelStore(
    (state) => state.modeByResourceId[resourceId] ?? 'closed'
  );
  const toggleMode = useWorkspaceResourceSidePanelStore((state) => state.toggleMode);

  return (
    <div className={styles.actions}>
      {inlineCommentAvailable ? (
        <AppIconButton
          icon={<MessageSquareText size={18} aria-hidden="true" />}
          label={mode === 'inlineComment' ? '收起批注栏' : '展开批注栏'}
          isActive={mode === 'inlineComment'}
          isDisabled={disabled}
          aria-expanded={mode === 'inlineComment'}
          tooltip={{ content: mode === 'inlineComment' ? '收起批注栏' : '打开批注栏' }}
          onPress={() => toggleMode(resourceId, 'inlineComment')}
        />
      ) : null}
      <AppIconButton
        icon={<MessagesSquare size={18} aria-hidden="true" />}
        label={mode === 'comment' ? '收起评论区' : '展开评论区'}
        isActive={mode === 'comment'}
        isDisabled={disabled}
        aria-expanded={mode === 'comment'}
        tooltip={{ content: mode === 'comment' ? '收起评论区' : '打开评论区' }}
        onPress={() => toggleMode(resourceId, 'comment')}
      />
    </div>
  );
}

export default WorkspaceResourceSidePanelActions;
