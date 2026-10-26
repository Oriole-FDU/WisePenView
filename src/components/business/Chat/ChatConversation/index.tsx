import styles from '../style.module.scss';
import { NEW_CHAT_WELCOME_CONFIG } from '../welcome';
import { useWelcomeScreenStore, WelcomeScreenHost } from '../WelcomeConfigurable';
import ChatInput from './ChatInput';
import { ChatInputStoreProvider } from './ChatInput/_context';
import ChatMessageList from './ChatMessageList';
import ChatSessionBar from './ChatSessionBar';
import type { ChatConversationProps } from './index.type';

/** 对话区：把对话域与会话域拆成消息列表、输入区和会话浮层，自身不持有业务状态。 */
function ChatConversation({
  injectedAgents,
  preferredAgent,
  contextPreview,
  fullWidth,
  session,
  turn,
  onClearContext,
  onSend,
  welcomeConfig,
}: ChatConversationProps) {
  const { cancel, cancelling, currentModel, history, isEmpty, messages, status } = turn;
  const {
    closeSessionBar,
    currentSessionId,
    ensureSession,
    promoteDraftToolSelection,
    selectSession,
    sessionBarOpen,
  } = session;

  const generating = status === 'submitted' || status === 'streaming';
  const sending = cancelling || generating;
  const isWelcome = isEmpty && !history.loadingInitial;
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
            canLoadMoreHistory={history.canLoadMore}
            loadingInitialHistory={history.loadingInitial}
            loadingMoreHistory={history.loadingMore}
            onLoadMoreHistory={history.loadMore}
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
                getUploadSessionId={ensureSession}
                sending={sending}
                sessionId={currentSessionId}
                promoteDraftToolSelection={promoteDraftToolSelection}
                onCancel={cancelling ? undefined : cancel}
                contextPreview={contextPreview}
                onClearContext={onClearContext}
                injectedAgents={injectedAgents}
                preferredAgent={preferredAgent}
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
          onClose={closeSessionBar}
          onSelectSession={selectSession}
        />
      ) : null}
    </div>
  );
}

export default ChatConversation;
