import AppIconButton from '@/components/Button/AppIconButton';
import { History, PanelRightClose, Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import styles from '../style.module.less';
import type { ChatPanelHeaderProps } from './index.type';

function ChatPanelHeader({
  panelTitle,
  sessionBarOpen,
  showCollapseButton,
  onCollapsePanel,
  onNewChat,
  onToggleSessionBar,
}: ChatPanelHeaderProps) {
  const { t } = useTranslation('chat');
  const sessionBarLabel = sessionBarOpen
    ? t('panel.sessionList.close')
    : t('panel.sessionList.open');

  return (
    <div className={styles.header}>
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
