import { clsx } from 'clsx';

import Chat from '@/components/business/Chat';
import { useMainShell } from '@/layouts/MainShell/_context';

import styles from './style.module.less';

function ChatPage() {
  // 与应用壳同源：窄屏用 panel 布局，宽屏用 page 布局；/chat 不展示 Chat Header。
  const { isMobileLayout: isCompactChat } = useMainShell();

  return (
    <div className={clsx(styles.root, isCompactChat && styles.compact)}>
      <div className={styles.chatHost}>
        <Chat
          fullWidth={isCompactChat ? 'panel' : 'page'}
          showHeader={false}
          showCollapseButton={false}
        />
      </div>
    </div>
  );
}

export default ChatPage;
