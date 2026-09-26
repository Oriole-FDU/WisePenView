import { clsx } from 'clsx';

import ChatPanel from '@/components/business/ChatPanel';
import { useMainShell } from '@/layouts/MainShell/_context';

import styles from './style.module.less';

function ChatPage() {
  // 与应用壳同源：窄屏用非 fullWidth 面板布局；/chat 不展示 ChatPanel Header。
  const { isMobileLayout: isCompactChat } = useMainShell();

  return (
    <div className={clsx(styles.root, isCompactChat && styles.compact)}>
      <div className={styles.chatPanelHost}>
        <ChatPanel fullWidth={!isCompactChat} showHeader={false} showCollapseButton={false} />
      </div>
    </div>
  );
}

export default ChatPage;
