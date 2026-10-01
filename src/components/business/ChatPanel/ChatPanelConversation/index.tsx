import ChatInput from '../ChatInput';
import ChatSessionBar from '../ChatSessionBar';
import MessageList from '../MessageList';
import styles from '../style.module.less';
import type { ChatPanelConversationProps } from './index.type';
import Welcome from './Welcome';

function ChatPanelConversation({
  agentDebug,
  cancelling,
  canLoadMoreHistory,
  contextPreview,
  currentModel,
  fullWidth,
  getUploadSessionId,
  loadingInitialHistory,
  loadingMoreHistory,
  messages,
  promoteDraftToolSelection,
  sessionBarOpen,
  sessionId,
  status,
  toolApprovalDecisions,
  onApprovalDecision,
  onCancel,
  onClearContext,
  onCloseSessionBar,
  onLoadMoreHistory,
  onSelectSession,
  onSend,
}: ChatPanelConversationProps) {
  const sending = cancelling || status === 'submitted' || status === 'streaming';
  const isWelcome = messages.length === 0 && !loadingInitialHistory;
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
            <MessageList
              messages={messages}
              sessionId={sessionId}
              canLoadMoreHistory={canLoadMoreHistory}
              loadingInitialHistory={loadingInitialHistory}
              loadingMoreHistory={loadingMoreHistory}
              onLoadMoreHistory={onLoadMoreHistory}
              status={status}
              model={currentModel}
              fullWidth={fullWidth}
              approvalDecisions={toolApprovalDecisions}
              approvalSubmitting={status === 'submitted' || status === 'streaming'}
              onApprovalDecision={onApprovalDecision}
            />
          </div>

          {fullWidth ? renderWelcomeSlot() : null}

          <div className={styles.composerCluster}>
            <div className={styles.footerSlot}>
              <div className={styles.inputColumn}>
                <ChatInput
                  onSend={onSend}
                  getUploadSessionId={getUploadSessionId}
                  sending={sending}
                  sessionId={sessionId}
                  promoteDraftToolSelection={promoteDraftToolSelection}
                  onCancel={cancelling ? undefined : onCancel}
                  contextPreview={contextPreview}
                  onClearContext={onClearContext}
                  injectedAgents={agentDebug ? [agentDebug.agent] : undefined}
                  preferredAgent={agentDebug?.agent}
                  fullWidth={fullWidth}
                />
              </div>
            </div>
          </div>

          <div className={styles.composerBottomSpacer} aria-hidden />
        </div>

        {sessionBarOpen ? (
          <ChatSessionBar
            activeSessionId={sessionId}
            onClose={onCloseSessionBar}
            onSelectSession={onSelectSession}
          />
        ) : null}
      </div>

      {fullWidth ? null : renderWelcomeSlot()}
    </>
  );
}

export default ChatPanelConversation;
