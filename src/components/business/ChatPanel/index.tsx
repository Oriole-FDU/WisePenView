import { memo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import AppAlertDialog from '@/components/business/AppAlertDialog';
import type { ChatPanelProps } from '@/components/business/ChatPanel/index.type';

import { useAgentDebugSendController } from './_controllers/useAgentDebugSendController';
import { useChatPanelLayout } from './_controllers/useChatPanelLayout';
import { useChatSessionController } from './_controllers/useChatSessionController';
import { useChatTurnController } from './_controllers/useChatTurnController';
import type { SendOptions } from './ChatInput/index.type';
import ChatPanelConversation from './ChatPanelConversation';
import ChatPanelHeader from './ChatPanelHeader';
import styles from './style.module.less';

function ChatPanel({
  fullWidth = false,
  showHeader,
  resourceChat,
  agentDebug,
  showCollapseButton = true,
}: ChatPanelProps) {
  const { t } = useTranslation(['chat', 'common']);
  const layout = useChatPanelLayout();
  const session = useChatSessionController({ resourceChat });
  const turn = useChatTurnController({
    ensureSession: session.ensureSession,
    isNewlyCreatedSession: session.isNewlyCreatedSession,
    clearNewlyCreatedSession: session.clearNewlyCreatedSession,
    resourceChat,
  });
  const debugSend = useAgentDebugSendController({ agentDebug, send: turn.send });
  const { syncNewSessionHistoryRefresh } = session;

  /**
   * @wisepen-manual-effect
   * 执行时机：新建会话的首个可渲染内容到达后。
   * 不可替代原因：新建标记属于会话域、可渲染状态属于对话域，只有顶层能同时观察两者。
   * cleanup：没有订阅或延迟任务，无需清理。
   */
  useEffect(() => {
    syncNewSessionHistoryRefresh(turn.hasRenderableChatContent);
  }, [syncNewSessionHistoryRefresh, turn.hasRenderableChatContent]);

  /** 发送前先过登录，再让调试域判断是否需要保存草稿，未命中则直接发送。 */
  const handleSend = (text: string, opts?: SendOptions) => {
    if (!session.isAuthenticated) {
      session.requireLogin();
      return false;
    }
    const intercepted = debugSend.tryInterceptSend(text, opts);
    if (intercepted) return intercepted;
    return turn.send(text, opts);
  };

  const handleCollapsePanel = () => {
    session.closeSessionBar();
    layout.collapsePanel();
  };

  return (
    <>
      <div className={`${styles.panel} ${fullWidth ? styles.fullWidth : ''}`}>
        {showHeader ? (
          <ChatPanelHeader
            panelTitle={session.panelTitle}
            sessionBarOpen={session.sessionBarOpen}
            showCollapseButton={showCollapseButton}
            reserveTitleBarEnd={!fullWidth}
            onCollapsePanel={handleCollapsePanel}
            onNewChat={session.startNewChat}
            onToggleSessionBar={session.toggleSessionBar}
          />
        ) : null}

        <ChatPanelConversation
          agentDebug={agentDebug}
          cancelling={turn.cancelling}
          canLoadMoreHistory={turn.history.canLoadMore}
          contextPreview={resourceChat?.context?.preview}
          currentModel={turn.currentModel}
          fullWidth={fullWidth}
          getUploadSessionId={session.ensureSession}
          isAuthenticated={session.isAuthenticated}
          loadingInitialHistory={turn.history.loadingInitial}
          loadingMoreHistory={turn.history.loadingMore}
          messages={turn.messages}
          promoteDraftToolSelection={session.promoteDraftToolSelection}
          sessionBarOpen={session.sessionBarOpen}
          sessionId={session.currentSessionId}
          status={turn.status}
          toolApprovalDecisions={turn.approval.decisions}
          onApprovalDecision={turn.approval.decide}
          onCancel={turn.cancel}
          onClearContext={resourceChat?.clearContext}
          onCloseSessionBar={session.closeSessionBar}
          onLoadMoreHistory={turn.history.loadMore}
          onRequireLogin={session.requireLogin}
          onSelectSession={session.selectSession}
          onSend={handleSend}
        />
      </div>
      <AppAlertDialog
        type="warning"
        isOpen={debugSend.isDialogOpen}
        onOpenChange={(open) => {
          if (!open) debugSend.cancel();
        }}
        title={t('panel.debugSave.title')}
        description={t('panel.debugSave.description')}
        cancelText={t('actions.cancel', { ns: 'common' })}
        confirmText={t('panel.debugSave.confirm')}
        isConfirmLoading={debugSend.saving || agentDebug?.isSaving}
        onConfirm={() => void debugSend.confirm()}
      />
    </>
  );
}

export default memo(ChatPanel);
