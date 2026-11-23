import { useChatComposer } from '../../hooks/useChatComposer';
import { NEW_CHAT_WELCOME_CONFIG, useWelcomeScreenStore, WelcomeScreenHost } from '../Welcome';
import ChatInput from './ChatInput';
import { ChatInputStoreProvider } from './ChatInput/_context';
import ChatMessageList from './ChatMessageList';
import ChatSessionBar from './ChatSessionBar';
import type { ChatConversationProps } from './index.type';
import styles from './style.module.scss';

/** 对话区：持有 composer（发送/建会话/取消），其余为投影与本地交互。 */
function ChatConversation({
  contextPreview,
  fullWidth,
  messages,
  status,
  isEmpty,
  currentSessionId,
  sessionBarOpen,
  canLoadMoreHistory,
  loadingInitialHistory,
  loadingMoreHistory,
  onCloseSessionBar,
  onSelectSession,
  onClearContext,
  resourceId,
  resourceChat,
  hostAgentPort,
  welcomeConfig,
}: ChatConversationProps) {
  const {
    currentModel,
    cancelling,
    promoteDraftToolSelection,
    ensureSession,
    onSend,
    onCancel,
    onLoadMoreHistory,
  } = useChatComposer({
    sessionId: currentSessionId,
    messages,
    resourceId,
    resourceChat,
    hostAgentPort,
  });

  const generating = status === 'submitted' || status === 'streaming';
  const sending = cancelling || generating;
  const isWelcome = isEmpty && !loadingInitialHistory;
  const showWelcome = isWelcome && !sessionBarOpen;
  const welcomeMode = useWelcomeScreenStore((state) => state.welcomeMode);

  const renderWelcomeSlot = () => (
    <div
      className={styles.welcomeSlot}
      data-visible={showWelcome ? 'true' : 'false'}
      data-welcome-mode={welcomeMode}
      aria-hidden={!showWelcome}
    >
      <div className={styles.welcomeSlotInner}>
        <WelcomeScreenHost
          config={welcomeConfig ?? NEW_CHAT_WELCOME_CONFIG}
          syncLayoutWithShell={showWelcome}
        />
      </div>
    </div>
  );

  const conversationBody = (
    <>
      <div
        className={styles.conversationPanel}
        data-welcome={isWelcome ? 'true' : 'false'}
        hidden={sessionBarOpen}
      >
        <div className={styles.messageViewport}>
          <ChatMessageList
            messages={messages}
            resetKey={currentSessionId}
            canLoadMoreHistory={canLoadMoreHistory}
            loadingInitialHistory={loadingInitialHistory}
            loadingMoreHistory={loadingMoreHistory}
            onLoadMoreHistory={onLoadMoreHistory}
            generating={generating}
            model={currentModel}
            fullWidth={fullWidth}
          />
        </div>

        {fullWidth ? renderWelcomeSlot() : null}

        <div className={styles.composerCluster}>
          <div className={styles.footerSlot}>
            <div className={styles.inputColumn}>
              <ChatInput
                onSend={onSend}
                getUploadSessionId={() => ensureSession()}
                sending={sending}
                sessionId={currentSessionId}
                promoteDraftToolSelection={promoteDraftToolSelection}
                onCancel={cancelling ? undefined : onCancel}
                contextPreview={contextPreview}
                onClearContext={onClearContext}
                injectedAgents={hostAgentPort?.injectedAgents}
                preferredAgent={hostAgentPort?.preferredAgent}
                fullWidth={fullWidth}
                useExternalStore
              />
            </div>
          </div>
        </div>

        <div className={styles.composerBottomSpacer} aria-hidden />
      </div>

      {fullWidth ? null : renderWelcomeSlot()}
    </>
  );

  return (
    <div className={styles.panelBody}>
      <ChatInputStoreProvider
        sessionId={currentSessionId}
        promoteDraftToolSelection={promoteDraftToolSelection}
      >
        {conversationBody}
      </ChatInputStoreProvider>

      {sessionBarOpen ? (
        <ChatSessionBar
          activeSessionId={currentSessionId}
          onClose={onCloseSessionBar}
          onSelectSession={onSelectSession}
        />
      ) : null}
    </div>
  );
}

export default ChatConversation;
