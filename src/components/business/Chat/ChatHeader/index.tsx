import { clsx } from 'clsx';
import { History, Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import AppIconButton from '@/components/base/Button/AppIconButton';
import { GuideAnchor } from '@/components/base/Guide';
import { WorkspacePanelHeader } from '@/components/business/WorkspacePanel';
import { GUIDE_TOOL_ID } from '@/constants/tour';
import { useDesktopWindowState } from '@/hooks/useDesktopWindowState';

import styles from '../style.module.scss';
import type { ChatHeaderProps } from './index.type';

function ChatHeader({
  panelTitle,
  sessionBarOpen,
  showCollapseButton,
  reserveTitleBarEnd = false,
  onCollapsePanel,
  onNewChat,
  onToggleSessionBar,
}: ChatHeaderProps) {
  const { t } = useTranslation('chat');
  const desktopWindow = useDesktopWindowState();
  const sessionBarLabel = sessionBarOpen
    ? t('panel.sessionList.close')
    : t('panel.sessionList.open');
  // 窗口按钮已固定在 App 层；此处只为 +/历史 预留右上空间，避免与固定按钮重叠。
  const titleBarInsetEnd =
    reserveTitleBarEnd &&
    desktopWindow.hasTitleBarInset &&
    desktopWindow.titleBarInsetSide === 'end';

  return (
    <WorkspacePanelHeader
      title={panelTitle}
      closeLabel={t('panel.collapse')}
      onClose={showCollapseButton ? onCollapsePanel : undefined}
      className={clsx(titleBarInsetEnd && styles.titleBarInsetEnd)}
      actions={
        <>
          <GuideAnchor id={GUIDE_TOOL_ID.noteNewChat}>
            <AppIconButton
              icon={<Plus size={18} aria-hidden="true" />}
              label={t('panel.create')}
              onPress={onNewChat}
            />
          </GuideAnchor>
          <GuideAnchor id={GUIDE_TOOL_ID.noteHistory}>
            <AppIconButton
              icon={<History size={18} aria-hidden="true" />}
              label={sessionBarLabel}
              isActive={sessionBarOpen}
              onPress={onToggleSessionBar}
            />
          </GuideAnchor>
        </>
      }
    />
  );
}

export default ChatHeader;
