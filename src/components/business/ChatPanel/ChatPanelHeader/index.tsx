import { History, PanelRightClose, Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import AppIconButton from '@/components/base/Button/AppIconButton';
import { useDesktopWindowState } from '@/hooks/useDesktopWindowState';
import { cn } from '@/utils/cn';

import styles from '../style.module.less';
import type { ChatPanelHeaderProps } from './index.type';

function ChatPanelHeader({
  panelTitle,
  sessionBarOpen,
  showCollapseButton,
  reserveTitleBarEnd = false,
  onCollapsePanel,
  onNewChat,
  onToggleSessionBar,
}: ChatPanelHeaderProps) {
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
    <div className={cn(styles.header, titleBarInsetEnd && styles.titleBarInsetEnd)}>
      <div className={styles.headerLeft}>
        {showCollapseButton ? (
          <AppIconButton
            icon={<PanelRightClose size={18} aria-hidden="true" />}
            label={t('panel.collapse')}
            onPress={onCollapsePanel}
          />
        ) : null}
        <div className={styles.titleWrap}>
          <div className={styles.title}>{panelTitle}</div>
        </div>
      </div>

      <div className={styles.headerRight}>
        <AppIconButton
          icon={<Plus size={18} aria-hidden="true" />}
          label={t('panel.create')}
          onPress={onNewChat}
        />
        <AppIconButton
          icon={<History size={18} aria-hidden="true" />}
          label={sessionBarLabel}
          isActive={sessionBarOpen}
          onPress={onToggleSessionBar}
        />
      </div>
    </div>
  );
}

export default ChatPanelHeader;
