import { MessageSquareText, MessagesSquare } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import AppIconButton from '@/components/base/Button/AppIconButton';

import { useResourceSidePanelStore } from '../../_store/useResourceSidePanelStore';

interface ResourceSidePanelActionsProps {
  resourceId: string;
  inlineCommentAvailable: boolean;
  disabled?: boolean;
}

function ResourceSidePanelActions({
  resourceId,
  inlineCommentAvailable,
  disabled,
}: ResourceSidePanelActionsProps) {
  const { t } = useTranslation('resource');
  const mode = useResourceSidePanelStore((state) => state.modeByResourceId[resourceId] ?? 'closed');
  const toggleMode = useResourceSidePanelStore((state) => state.toggleMode);

  return (
    <>
      {inlineCommentAvailable ? (
        <AppIconButton
          icon={<MessageSquareText size={18} aria-hidden="true" />}
          label={
            mode === 'inlineComment'
              ? t('sidePanel.collapseAnnotation')
              : t('sidePanel.expandAnnotation')
          }
          size="sm"
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
        size="sm"
        isActive={mode === 'comment'}
        isDisabled={disabled}
        aria-expanded={mode === 'comment'}
        tooltip={{
          content:
            mode === 'comment' ? t('sidePanel.collapseComments') : t('sidePanel.openComments'),
        }}
        onPress={() => toggleMode(resourceId, 'comment')}
      />
    </>
  );
}

export default ResourceSidePanelActions;
