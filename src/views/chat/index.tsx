import ChatPanel from '@/components/ChatPanel';
import { clearNewChatSessionStore, useCurrentChatSessionStore } from '@/store';
import { useMount } from 'ahooks';
import { useNavigate, useParams } from 'react-router-dom';
import styles from './style.module.less';

const BASE = '/app/chat';

function ChatPage() {
  const { sessionId: routeSessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const currentSessionId = useCurrentChatSessionStore((s) => s.currentSessionId);
  const setCurrentSession = useCurrentChatSessionStore((s) => s.setCurrentSession);
  const clearCurrentSession = useCurrentChatSessionStore((s) => s.clearCurrentSession);

  useMount(() => {
    if (routeSessionId && routeSessionId !== currentSessionId) {
      setCurrentSession({ id: routeSessionId, title: '' });
      return;
    }
    if (!routeSessionId) {
      clearCurrentSession();
      clearNewChatSessionStore();
    }
  });

  const handleNewChat = async () => {
    clearCurrentSession();
    clearNewChatSessionStore();
    navigate(BASE, { replace: true });
  };

  return (
    <div className={styles.root}>
      <ChatPanel collapsed={false} fullWidth onNewChat={handleNewChat} />
    </div>
  );
}

export default ChatPage;
