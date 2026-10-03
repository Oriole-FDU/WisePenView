import ChatInput from '../ChatInput';
import ChatMessageList from '../ChatMessageList';
import ChatSessionBar from '../ChatSessionBar';
import styles from '../style.module.less';
import type { ChatConversationProps } from './index.type';
import Welcome from './Welcome';

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
  const renderWelcomeSlot = () => (
    <div
      className={styles.welcomeSlot}
      data-visible={showWelcome ? 'true' : 'false'}
      aria-hidden={!showWelcome}
    >
      <div className={styles.welcomeSlotInner}>
        <Welcome />
      </div>
    </div>
  );

  return (
    <>
      <div className={styles.panelBody}>
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
                />
              </div>
            </div>
          </div>

          <div className={styles.composerBottomSpacer} aria-hidden />
        </div>

        {sessionBarOpen ? (
          <ChatSessionBar
            activeSessionId={currentSessionId}
            onClose={closeSessionBar}
            onSelectSession={selectSession}
          />
        ) : null}
      </div>

      {fullWidth ? null : renderWelcomeSlot()}
    </>
  );
}

export default ChatConversation;
