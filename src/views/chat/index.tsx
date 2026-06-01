import React, { useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMount } from 'ahooks';
import ChatPanel from '@/components/ChatPanel';
import { useCurrentChatSessionStore, clearNewChatSessionStore } from '@/store';
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

  const handleNewChat = useCallback(async () => {
    clearCurrentSession();
    clearNewChatSessionStore();
    navigate(BASE, { replace: true });
  }, [clearCurrentSession, navigate]);

  return (
    <div className={styles.root}>
      <ChatPanel collapsed={false} fullWidth onNewChat={handleNewChat} />
    </div>
  );
};

export default ChatPage;
