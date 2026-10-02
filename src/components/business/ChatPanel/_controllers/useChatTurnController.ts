import { toast } from '@heroui/react';
import { useLatest, useUnmountedRef } from 'ahooks';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useChatService } from '@/domains';
import { type ChatModel, type CreateSessionRequest, useChatSession } from '@/domains/Chat';
import { readFrontendStates } from '@/frontendState';
import { useChatSessionRoute } from '@/hooks/useChatSessionRoute';
import { useAppAuth } from '@/layouts/App/_context';
import { parseErrorMessage } from '@/utils/error';

import type { SendOptions } from '../ChatInput/index.type';
import type { ChatPanelProps } from '../index.type';
import { hasRenderableChatContent } from './chatTurnModel';
import { useChatToolApproval } from './useChatToolApproval';
import { useChatTurnHistory } from './useChatTurnHistory';

interface UseChatTurnControllerOptions {
  /** 会话域提供的按需建会话能力，用于发送前确保存在目标会话 */
  ensureSession: (agentParams?: CreateSessionRequest) => Promise<string | undefined>;
  isNewlyCreatedSession: (sessionId: string) => boolean;
  clearNewlyCreatedSession: (sessionId: string) => void;
  resourceChat?: ChatPanelProps['resourceChat'];
  resourceId?: string;
}

/**
 * 对话域组合根：当前会话的一轮对话生命周期。
 *
 * Chat 运行时（消息列表、运行状态、当前轮次）只能存在一个实例，因此由本 Controller 独占；
 * 历史分页与工具审批各自维护独立状态，以 `history` / `approval` 命名空间输出，
 * 本 Controller 只负责持有运行时、发送取消和模型选择。
 */
export function useChatTurnController({
  ensureSession,
  isNewlyCreatedSession,
  clearNewlyCreatedSession,
  resourceChat,
  resourceId,
}: UseChatTurnControllerOptions) {
  const { t } = useTranslation(['chat', 'common']);
  const appAuth = useAppAuth();
  const chatService = useChatService();
  const { sessionId: currentSessionId, locationKey } = useChatSessionRoute();
  const routeLatest = useLatest({ sessionId: currentSessionId, locationKey });
  const unmountedRef = useUnmountedRef();
  const resourceStateProvider = resourceChat?.provider;
  const resourceChatContext = resourceChat?.context;
  const clearResourceChatContext = resourceChat?.clearContext;

  const [currentModel, setCurrentModel] = useState<ChatModel | null>(null);
  const [cancellingSessionId, setCancellingSessionId] = useState<string | null>(null);

  const {
    messages,
    status,
    setMessages,
    sendSessionMessage,
    recoverSession,
    stop,
    resumeSessionStream,
  } = useChatSession({
    sessionId: currentSessionId ?? '',
    model: currentModel?.modelId,
    getActiveTurnId: chatService.getActiveTurnId,
    onError: (error) => {
      toast.danger(parseErrorMessage(error));
    },
  });

  const history = useChatTurnHistory({
    setMessages,
    resumeSessionStream,
    stop,
    isNewlyCreatedSession,
    clearNewlyCreatedSession,
  });
  const approval = useChatToolApproval({
    sessionId: currentSessionId,
    messages,
    status,
    recover: recoverSession,
  });

  /** 发送一轮消息：校验登录与资源上下文，必要时先建立会话，再把前端状态随消息提交。 */
  const send = async (text: string, opts?: SendOptions): Promise<boolean> => {
    if (unmountedRef.current || routeLatest.current.locationKey !== locationKey) return false;
    if (!appAuth.isAuthenticated) {
      appAuth.requireLogin();
      return false;
    }
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
      agentParams = {
        agentId: selectedAgent.resourceId,
        agentVersion: selectedAgent.agentVersion,
      };
    } else if (selectedAgent?.isDefault || selectedAgent?.source === 'DEFAULT') {
      agentParams = { agentId: null, agentVersion: null };
    }

    let targetSessionId: string | undefined;
    try {
      targetSessionId = await ensureSession(agentParams);
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

    void sendSessionMessage(text, {
      model: targetModel.modelId,
      providerId: targetModel.providerId,
      sessionId: targetSessionId,
      frontendStates: frontendState.states,
      selectedResources,
      uploadedAttachments: opts?.activeAttachments,
      toolSelectionOverrides: opts?.toolSelectionOverrides,
      onDemandSkillIds,
    }).catch((error) => {
      toast.danger(parseErrorMessage(error));
    });

    frontendState.finishSend();
    if (resourceChatContext) {
      clearResourceChatContext?.(resourceChatContext);
    }
    return true;
  };

  const cancel = async (): Promise<void> => {
    const targetSessionId = currentSessionId;
    if (!targetSessionId || cancellingSessionId === targetSessionId) return;

    setCancellingSessionId(targetSessionId);
    void stop();
    try {
      await chatService.cancelTurn(targetSessionId);
    } catch (error) {
      toast.danger(t('input.cancelFailed', { error: parseErrorMessage(error) }));
    } finally {
      setCancellingSessionId((sessionId) => (sessionId === targetSessionId ? null : sessionId));
    }
  };

  return {
    approval,
    cancel,
    cancelling: cancellingSessionId === currentSessionId,
    currentModel,
    hasRenderableChatContent: hasRenderableChatContent(messages),
    history,
    isEmpty: messages.length === 0,
    messages,
    send,
    status,
  };
}
