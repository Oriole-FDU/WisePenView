import { toast } from '@heroui/react';
import { useLatest, useUnmountedRef } from 'ahooks';
import { memo, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { ChatProps } from '@/components/business/Chat/index.type';
import type { ChatModel } from '@/domains/ChatConfig';
import type { CreateSessionRequest } from '@/domains/ChatSession';
import { useChatRuntime } from '@/domains/ChatTurn';
import { readFrontendStates, useFrontendStateValue } from '@/frontendState';
import { useChatSessionRoute } from '@/hooks/useChatSessionRoute';
import { useAppAuth } from '@/layouts/App/_context';
import { captureException } from '@/observability';
import { parseErrorMessage } from '@/utils/error';

import { hasRenderableChatContent } from './_controllers/chatTurnModel';
import { useChatSessionController } from './_controllers/useChatSessionController';
import ChatConversation from './ChatConversation';
import type { ChatConversationTurn } from './ChatConversation/index.type';
import ChatHeader from './ChatHeader';
import type { SendOptions } from './send.type';
import styles from './style.module.scss';
import ToolApprovalDialog from './ToolApprovalDialog';

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
  const { isAuthenticated, requireLogin } = useAppAuth();
  const { sessionId, locationKey } = useChatSessionRoute();
  const routeLatest = useLatest({ sessionId, locationKey });
  const locationKeyLatest = useLatest(locationKey);
  const unmountedRef = useUnmountedRef();
  const selectedText = useFrontendStateValue('selected_text');
  const session = useChatSessionController({ resourceChat });
  const [currentModel, setCurrentModel] = useState<ChatModel | null>(null);

  const resourceStateProvider = resourceChat?.provider;
  const resourceChatContext = resourceChat?.context;
  const clearResourceChatContext = resourceChat?.clearContext;

  const runtime = useChatRuntime({
    sessionId: sessionId ?? '',
    model: currentModel?.modelId,
    isNewlyCreatedSession: session.isNewlyCreatedSession,
    clearNewlyCreatedSession: session.clearNewlyCreatedSession,
    onError: (error) => {
      toast.danger(parseErrorMessage(error));
    },
  });

  const { syncNewSessionHistoryRefresh } = session;
  const pendingToolApproval = runtime.approval.pending;
  const renderable = hasRenderableChatContent(runtime.messages);

  /**
   * @wisepen-manual-effect
   * 执行时机：新建会话的首个可渲染内容到达后。
   * 不可替代原因：新建标记属于会话域、可渲染状态属于对话域，只有顶层能同时观察两者。
   * cleanup：没有订阅或延迟任务，无需清理。
   */
  useEffect(() => {
    syncNewSessionHistoryRefresh(renderable);
  }, [syncNewSessionHistoryRefresh, renderable]);

  /**
   * 发送处维护：登录、宿主守卫、资源门禁、ensureSession、载荷拼装与 toast，
   * 最后落到 runtime.send。
   */
  const handleSend = async (text: string, opts?: SendOptions): Promise<boolean> => {
    if (!isAuthenticated) {
      requireLogin();
      return false;
    }

    const guarded = hostAgentPort?.interceptSend?.(text, opts);
    if (guarded) {
      const pendingLocationKey = locationKeyLatest.current;
      const accepted = await guarded;
      if (!accepted || locationKeyLatest.current !== pendingLocationKey) return false;
    }

    if (unmountedRef.current || routeLatest.current.locationKey !== locationKey) return false;

    const targetModel = opts?.model ?? currentModel;
    if (!targetModel) return false;

    const sendBlockedReason = resourceStateProvider?.getBlockedReason?.();
    if (sendBlockedReason) {
      toast.warning(sendBlockedReason);
      return false;
    }
    if (resourceChatContext && resourceChatContext.providerKey !== resourceStateProvider?.key) {
      toast.warning(t('panel.contextMismatch'));
      return false;
    }

    setCurrentModel(targetModel);

    const selectedAgent = opts?.selectedAgent;
    let agentParams: CreateSessionRequest | undefined;
    if (selectedAgent?.resourceId) {
      agentParams = { agentId: selectedAgent.resourceId };
    } else if (selectedAgent?.isDefault || selectedAgent?.source === 'DEFAULT') {
      agentParams = { agentId: null };
    }

    let targetSessionId: string | undefined;
    try {
      targetSessionId = await session.ensureSession(agentParams);
    } catch (error) {
      toast.danger(parseErrorMessage(error));
      return false;
    }
    if (!targetSessionId) return false;

    const frontendState = readFrontendStates({ resourceId });
    if (frontendState.resourceMismatch) {
      toast.warning(t('panel.contextMismatch'));
      return false;
    }
    const selectedResourceState = frontendState.states.find(
      (state) => state.key === 'selected_resources'
    );
    const selectedResources =
      selectedResourceState?.key === 'selected_resources'
        ? selectedResourceState.value.map((resource) => ({
            resourceId: resource.resource_id,
            resourceName: resource.resource_name,
            resourceType: resource.resource_type,
            enabled: true,
          }))
        : undefined;

    const selectedSkillIds = opts?.selectedSkills?.map((skill) => skill.skillId);
    const resourceSkillIds = resourceStateProvider?.onDemandSkillIds;
    const onDemandSkillIds =
      selectedSkillIds !== undefined || resourceSkillIds !== undefined
        ? Array.from(new Set([...(selectedSkillIds ?? []), ...(resourceSkillIds ?? [])]))
        : undefined;

    void runtime
      .send(text, {
        model: targetModel.modelId,
        providerId: targetModel.providerId,
        sessionId: targetSessionId,
        frontendStates: frontendState.states,
        selectedResources,
        uploadedAttachments: opts?.activeAttachments,
        toolSelectionOverrides: opts?.toolSelectionOverrides,
        onDemandSkillIds,
      })
      .catch((error) => {
        captureException(error, {
          detector: 'application-handled',
          operation: 'chat.send',
        });
        toast.danger(parseErrorMessage(error));
      });

    frontendState.finishSend();
    if (resourceChatContext) {
      clearResourceChatContext?.(resourceChatContext);
    }
    return true;
  };

  const handleCancel = async (): Promise<void> => {
    try {
      await runtime.cancel();
    } catch (error) {
      toast.danger(t('input.cancelFailed', { error: parseErrorMessage(error) }));
    }
  };

  const turn: ChatConversationTurn = {
    cancel: handleCancel,
    cancelling: runtime.cancelling,
    currentModel,
    history: runtime.history,
    isEmpty: runtime.messages.length === 0,
    messages: runtime.messages,
    status: runtime.status,
  };

  const handleCollapsePanel = () => {
    session.closeSessionBar();
    onCollapsePanel?.();
  };

  /** 子组件仍以布尔消费宽度差异，只在面板边界把布局模式收敛成一次判断。 */
  const isFullWidth = fullWidth === 'page';

  return (
    <>
      {/* data-chat-layout 是跨模块样式锚点：子组件用 [data-chat-layout] 分支 panel/page */}
      <div className={styles.panel} data-chat-layout={fullWidth}>
        {showHeader ? (
          <ChatHeader
            panelTitle={session.panelTitle}
            sessionBarOpen={session.sessionBarOpen}
            showCollapseButton={showCollapseButton}
            reserveTitleBarEnd={!isFullWidth}
            onCollapsePanel={handleCollapsePanel}
            onNewChat={session.startNewChat}
            onToggleSessionBar={session.toggleSessionBar}
          />
        ) : null}

        <ChatConversation
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
          submitting={runtime.approval.submitting}
          onDecision={(approved) =>
            runtime.approval.decide(pendingToolApproval.toolCallId, approved)
          }
        />
      ) : null}
    </>
  );
}

export default memo(Chat);
