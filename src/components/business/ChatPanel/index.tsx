import { useLatest } from 'ahooks';
import { memo, useEffect } from 'react';

import type { ChatPanelProps } from '@/components/business/ChatPanel/index.type';
import { useFrontendStateValue } from '@/frontendState';
import { useChatSessionRoute } from '@/hooks/useChatSessionRoute';
import { useAppAuth } from '@/layouts/App/_context';

import { useChatPanelLayout } from './_controllers/useChatPanelLayout';
import { useChatSessionController } from './_controllers/useChatSessionController';
import { useChatTurnController } from './_controllers/useChatTurnController';
import type { SendOptions } from './ChatInput/index.type';
import ChatPanelConversation from './ChatPanelConversation';
import ChatPanelHeader from './ChatPanelHeader';
import styles from './style.module.less';
import ToolApprovalDialog from './ToolApprovalDialog';

function ChatPanel({
  fullWidth = 'panel',
  showHeader,
  resourceChat,
  resourceId,
  hostAgentPort,
  showCollapseButton = true,
}: ChatPanelProps) {
  const { isAuthenticated, requireLogin } = useAppAuth();
  const { locationKey } = useChatSessionRoute();
  const locationKeyLatest = useLatest(locationKey);
  const layout = useChatPanelLayout();
  const selectedText = useFrontendStateValue('selected_text');
  const session = useChatSessionController({ resourceChat });
  const turn = useChatTurnController({
    ensureSession: session.ensureSession,
    isNewlyCreatedSession: session.isNewlyCreatedSession,
    clearNewlyCreatedSession: session.clearNewlyCreatedSession,
    resourceChat,
    resourceId,
  });
  const { syncNewSessionHistoryRefresh } = session;
  const pendingToolApproval = turn.approval.pending;

  /**
   * @wisepen-manual-effect
   * 执行时机：新建会话的首个可渲染内容到达后。
   * 不可替代原因：新建标记属于会话域、可渲染状态属于对话域，只有顶层能同时观察两者。
   * cleanup：没有订阅或延迟任务，无需清理。
   */
  useEffect(() => {
    syncNewSessionHistoryRefresh(turn.hasRenderableChatContent);
  }, [syncNewSessionHistoryRefresh, turn.hasRenderableChatContent]);

  /**
   * 发送前先过登录，再交给宿主的发送前置守卫；守卫挂起期间路由已切换时放弃发送，
   * 避免守卫的结论落到过期会话。未命中守卫则直接发送。
   */
  const handleSend = (text: string, opts?: SendOptions) => {
    if (!isAuthenticated) {
      requireLogin();
      return false;
    }
    const guarded = hostAgentPort?.interceptSend?.(text, opts);
    if (!guarded) return turn.send(text, opts);
    const pendingLocationKey = locationKeyLatest.current;
    return guarded.then((accepted) => {
      if (!accepted || locationKeyLatest.current !== pendingLocationKey) return false;
      return turn.send(text, opts);
    });
  };

  const handleCollapsePanel = () => {
    session.closeSessionBar();
    layout.collapsePanel();
  };

  /** 子组件仍以布尔消费宽度差异，只在面板边界把布局模式收敛成一次判断。 */
  const isFullWidth = fullWidth === 'page';

  return (
    <>
      {/* data-chat-layout 是跨模块样式锚点：子组件用 [data-chat-layout] 分支 panel/page */}
      <div className={styles.panel} data-chat-layout={fullWidth}>
        {showHeader ? (
          <ChatPanelHeader
            panelTitle={session.panelTitle}
            sessionBarOpen={session.sessionBarOpen}
            showCollapseButton={showCollapseButton}
            reserveTitleBarEnd={!isFullWidth}
            onCollapsePanel={handleCollapsePanel}
            onNewChat={session.startNewChat}
            onToggleSessionBar={session.toggleSessionBar}
          />
        ) : null}

        <ChatPanelConversation
          injectedAgents={hostAgentPort?.injectedAgents}
          preferredAgent={hostAgentPort?.preferredAgent}
          contextPreview={resourceChat?.context ? selectedText : undefined}
          fullWidth={isFullWidth}
          session={session}
          turn={turn}
          onClearContext={resourceChat?.clearContext}
          onSend={handleSend}
        />
      </div>
      {pendingToolApproval ? (
        <ToolApprovalDialog
          key={pendingToolApproval.toolCallId}
          name={pendingToolApproval.name}
          input={pendingToolApproval.input}
          submitting={turn.approval.submitting}
          onDecision={(approved) => turn.approval.decide(pendingToolApproval.toolCallId, approved)}
        />
      ) : null}
    </>
  );
}

export default memo(ChatPanel);
