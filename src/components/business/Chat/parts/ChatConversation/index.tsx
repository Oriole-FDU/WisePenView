import { NEW_CHAT_WELCOME_CONFIG, welcomeModeFromBlockCount, WelcomeScreenHost } from '../Welcome';
import ChatInput from './ChatInput';
import { ChatInputStoreProvider } from './ChatInput/_context';
import ChatMessageList from './ChatMessageList';
import ChatSessionBar from './ChatSessionBar';
import type { ChatConversationProps } from './index.type';
import styles from './style.module.scss';
import { useChatComposer } from './useChatComposer';

/** 对话区：持有 composer（发送/建会话/取消），其余为投影与本地交互。 */
function ChatConversation({
  view,
  session,
  host,
  fullWidth,
  welcomeConfig,
}: ChatConversationProps) {
  const { messages, status, canLoadMoreHistory, loadingInitialHistory, loadingMoreHistory } = view;
  const { sessionId, sessionBarOpen, onCloseSessionBar, onSelectSession } = session;
  const { resourceId, resourceChat, hostAgentPort, contextPreview } = host ?? {};

  const {
    currentModel,
    cancelling,
    promoteDraftToolSelection,
    ensureSession,
    onSend,
    onCancel,
    onLoadMoreHistory,
  } = useChatComposer({
    sessionId,
    messages,
    resourceId,
    resourceChat,
    hostAgentPort,
  });

  const generating = status === 'submitted' || status === 'streaming';
  const sending = cancelling || generating;
  const isWelcome = messages.length === 0 && !loadingInitialHistory;
  const showWelcome = isWelcome && !sessionBarOpen;
  const resolvedWelcomeConfig = welcomeConfig ?? NEW_CHAT_WELCOME_CONFIG;
  const welcomeMode = welcomeModeFromBlockCount(resolvedWelcomeConfig.blocks.length);

  const renderWelcomeSlot = () => (
    <div
      className={styles.welcomeSlot}
      data-visible={showWelcome ? 'true' : 'false'}
      data-welcome-mode={welcomeMode}
      aria-hidden={!showWelcome}
    >
      <div className={styles.welcomeSlotInner}>
        <WelcomeScreenHost config={resolvedWelcomeConfig} />
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
            resetKey={sessionId}
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
                sessionId={sessionId}
                promoteDraftToolSelection={promoteDraftToolSelection}
                onCancel={cancelling ? undefined : onCancel}
                contextPreview={contextPreview}
                onClearContext={resourceChat?.clearContext}
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
        sessionId={sessionId}
        promoteDraftToolSelection={promoteDraftToolSelection}
      >
        {conversationBody}
      </ChatInputStoreProvider>

      {sessionBarOpen ? (
        <ChatSessionBar
          activeSessionId={sessionId}
          onClose={onCloseSessionBar}
          onSelectSession={onSelectSession}
        />
      ) : null}
    </div>
  );
}

export default ChatConversation;
