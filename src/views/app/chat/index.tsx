import { clsx } from 'clsx';
import { useParams } from 'react-router-dom';

import { GuideScope } from '@/components/base/Guide';
import Chat from '@/components/business/Chat';
import { GUIDE_TOUR_ID } from '@/constants/tour';
import { useMainShell } from '@/layouts/MainShell/_context';

import styles from './style.module.scss';

function ChatPage() {
  // 与应用壳同源：窄屏用 panel 布局，宽屏用 page 布局；/chat 不展示 Chat Header。
  const { isMobileLayout: isCompactChat } = useMainShell();
  const { sessionId } = useParams<{ sessionId?: string }>();

  return (
    <GuideScope tourId={sessionId ? undefined : GUIDE_TOUR_ID.chat}>
      <div className={clsx(styles.root, isCompactChat && styles.compact)}>
        <div className={styles.chatHost}>
          <Chat
            fullWidth={isCompactChat ? 'panel' : 'page'}
            showHeader={false}
            showCollapseButton={false}
          />
        </div>
      </div>
    </GuideScope>
  );
}

export default ChatPage;
