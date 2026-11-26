import { memo } from 'react';
import { useTranslation } from 'react-i18next';

import type { ChatProps } from '@/components/business/Chat/index.type';
import { useChatSessionMetadata } from '@/domains/ChatSession';
import { useFrontendStateValue } from '@/frontendState';
import { useChatSessionRoute } from '@/hooks/useChatSessionRoute';
import { useChatSession } from '@/runtime/chat';

import { useChatSessionChrome } from './hooks/useChatSessionChrome';
import ChatConversation from './parts/ChatConversation';
import ChatHeader from './parts/ChatHeader';
import ChatToolApproval from './parts/ChatToolApproval';
import styles from './style.module.scss';

function Chat({
  fullWidth = 'panel',
  showHeader,
  resourceChat,
  resourceId,
  hostAgentPort,
  showCollapseButton = true,
  onCollapsePanel,
}: ChatProps) {
  const { t } = useTranslation(['chat', 'common']);
  const { sessionId: currentSessionId, selectSession } = useChatSessionRoute();
  const currentSession = useChatSessionMetadata(currentSessionId);
  const selectedText = useFrontendStateValue('selected_text');

  const view = useChatSession(currentSessionId);
  const chrome = useChatSessionChrome({
    currentSessionId,
    selectSession,
    clearResourceChatContext: resourceChat?.clearContext,
    onCollapsePanel,
  });

  const panelTitle =
    currentSession?.title || t(currentSessionId ? 'session.untitled' : 'panel.newChat');
  const isFullWidth = fullWidth === 'page';

  return (
    <>
      <div className={styles.panel} data-chat-layout={fullWidth}>
        {showHeader ? (
          <ChatHeader
            panelTitle={panelTitle}
            sessionBarOpen={chrome.sessionBarOpen}
            showCollapseButton={showCollapseButton}
            reserveTitleBarEnd={!isFullWidth}
            onCollapsePanel={chrome.handleCollapsePanel}
            onNewChat={chrome.startNewChat}
            onToggleSessionBar={chrome.toggleSessionBar}
          />
        ) : null}

        <ChatConversation
          fullWidth={isFullWidth}
          view={view}
          session={{
            sessionId: currentSessionId,
            sessionBarOpen: chrome.sessionBarOpen,
            onCloseSessionBar: chrome.closeSessionBar,
            onSelectSession: chrome.handleSelectSession,
          }}
          host={{
            resourceId,
            resourceChat,
            hostAgentPort,
            contextPreview: resourceChat?.context ? selectedText : undefined,
          }}
        />
      </div>
      <ChatToolApproval
        key={currentSessionId}
        sessionId={currentSessionId}
        phase={view.phase}
        messages={view.messages}
      />
    </>
  );
}

export default memo(Chat);
