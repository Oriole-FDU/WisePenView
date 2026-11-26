import { useState } from 'react';

import type { ChatSession } from '@/domains/ChatSession';

import { useChatGuards } from './useChatGuards';

type UseChatSessionChromeParams = {
  currentSessionId: string | undefined;
  selectSession: (sessionId?: string) => void | Promise<void>;
  clearResourceChatContext?: () => void;
  onCollapsePanel?: () => void;
};

/** Header / 会话栏开合与切会话，不碰发送与 Runtime I/O。 */
export function useChatSessionChrome({
  currentSessionId,
  selectSession,
  clearResourceChatContext,
  onCollapsePanel,
}: UseChatSessionChromeParams) {
  const { requireAuth } = useChatGuards();
  const [sessionBarOpen, setSessionBarOpen] = useState(false);

  const closeSessionBar = () => setSessionBarOpen(false);

  const toggleSessionBar = () => {
    if (!requireAuth()) return;
    setSessionBarOpen((open) => !open);
  };

  const handleSelectSession = (session: ChatSession) => {
    if (!requireAuth()) return;
    if (session.id === currentSessionId) {
      setSessionBarOpen(false);
      return;
    }
    clearResourceChatContext?.();
    setSessionBarOpen(false);
    void selectSession(session.id);
  };

  const startNewChat = () => {
    if (!requireAuth()) return;
    clearResourceChatContext?.();
    setSessionBarOpen(false);
    void selectSession();
  };

  const handleCollapsePanel = () => {
    closeSessionBar();
    onCollapsePanel?.();
  };

  return {
    sessionBarOpen,
    closeSessionBar,
    toggleSessionBar,
    handleSelectSession,
    startNewChat,
    handleCollapsePanel,
  };
}
