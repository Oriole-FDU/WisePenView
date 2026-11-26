import { toast } from '@heroui/react';
import { useMemoizedFn } from 'ahooks';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useChatSessionService } from '@/domains';
import type { ChatModel } from '@/domains/ChatConfig';
import type { WisePenUIMessage } from '@/domains/ChatSession';
import { useChatSessionHistoryRefreshStore } from '@/layouts/AppLayout/_store/useChatSessionHistoryRefreshStore';
import { captureException } from '@/observability';
import { buildSessionSendPayload, useChatSessions } from '@/runtime/chat';
import { createClientError, FRONTEND_CLIENT_ERROR, parseErrorMessage } from '@/utils/error';

import { useChatGuards } from '../../hooks/useChatGuards';
import type { ChatHostAgentPort, ChatProps, SendOptions } from '../../index.type';
import { useRefreshHistoryOnFirstContent } from './useRefreshHistoryOnFirstContent';

type UseChatComposerParams = {
  sessionId: string | undefined;
  messages: readonly WisePenUIMessage[];
  resourceId?: string;
  resourceChat?: ChatProps['resourceChat'];
  hostAgentPort?: ChatHostAgentPort;
};

/**
 * 输入区编排：发送、建会话、取消、模型与新建草稿标记。
 * Conversation part 私有；根 hooks 不放仅服务本 part 的编排。
 */
export function useChatComposer({
  sessionId,
  messages,
  resourceId,
  resourceChat,
  hostAgentPort,
}: UseChatComposerParams) {
  const { t } = useTranslation(['chat', 'common']);
  const requestChatSessionHistoryRefresh = useChatSessionHistoryRefreshStore(
    (state) => state.requestRefresh
  );
  const {
    locationKey,
    composerKey,
    isDraftPromotion,
    selectSession,
    requireAuth,
    isRouteLive,
    isComposerLive,
  } = useChatGuards();
  const sessions = useChatSessions();
  const chatSessionService = useChatSessionService();

  const [currentModel, setCurrentModel] = useState<ChatModel | null>(null);
  const pendingHistoryRefreshRef = useRef<string | undefined>(undefined);
  const sendingComposerKeys = useRef(new Set<string>());
  const creatingSessionRef = useRef<{
    locationKey: string;
    promise: Promise<{ id: string; agentId?: string | null }>;
  } | null>(null);

  const resourceStateProvider = resourceChat?.provider;
  const resourceChatContext = resourceChat?.context;
  const clearResourceChatContext = resourceChat?.clearContext;

  useRefreshHistoryOnFirstContent(
    sessionId,
    messages,
    pendingHistoryRefreshRef,
    requestChatSessionHistoryRefresh
  );

  async function bindCreatedSessionToRoute(createdSessionId: string, startedLocationKey: string) {
    requestChatSessionHistoryRefresh();
    if (!isRouteLive(startedLocationKey)) return;
    pendingHistoryRefreshRef.current = createdSessionId;
    await selectSession(createdSessionId, 'promote-draft');
  }

  function createDraftSession(agentId?: string | null) {
    if (creatingSessionRef.current?.locationKey === locationKey) {
      return creatingSessionRef.current.promise;
    }

    const promise = (async () => {
      const { id } = await chatSessionService.createSession(
        agentId === undefined ? undefined : { agentId }
      );
      return sessions.withSession(
        id,
        async () => {
          await bindCreatedSessionToRoute(id, locationKey);
          return { id, agentId };
        },
        { newSession: true }
      );
    })();
    creatingSessionRef.current = { locationKey, promise };
    const clearPending = () => {
      if (creatingSessionRef.current?.promise === promise) creatingSessionRef.current = null;
    };
    void promise.then(clearPending, clearPending);
    return promise;
  }

  const ensureSession = useMemoizedFn(async (): Promise<string | undefined> => {
    if (!isRouteLive(locationKey)) return;
    if (!requireAuth()) {
      throw createClientError(FRONTEND_CLIENT_ERROR.INTERNAL_STATE, {
        reason: t('input.loginRequired'),
      });
    }
    if (sessionId) return sessionId;

    const { id } = await createDraftSession();
    if (isComposerLive(composerKey, id)) return id;
  });

  const send = async (text: string, opts?: SendOptions): Promise<boolean> => {
    if (sendingComposerKeys.current.has(composerKey)) return false;
    if (!isRouteLive(locationKey) || !requireAuth()) return false;

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
    let agentId: string | null | undefined;
    if (selectedAgent?.resourceId) {
      agentId = selectedAgent.resourceId;
    } else if (selectedAgent?.isDefault || selectedAgent?.source === 'DEFAULT') {
      agentId = null;
    }

    const payload = buildSessionSendPayload({
      resourceId,
      modelId: targetModel.modelId,
      providerId: targetModel.providerId,
      uploadedAttachments: opts?.activeAttachments,
      toolSelectionOverrides: opts?.toolSelectionOverrides,
      selectedSkillIds: opts?.selectedSkills?.map((skill) => skill.skillId),
      resourceOnDemandSkillIds: resourceStateProvider?.onDemandSkillIds,
    });
    if (!payload.ok) {
      toast.warning(t('panel.contextMismatch'));
      return false;
    }

    sendingComposerKeys.current.add(composerKey);
    try {
      const target = sessionId ? { id: sessionId } : await createDraftSession(agentId);
      await sessions.withSession(
        target.id,
        (runtime) =>
          runtime.send(text, payload.options, agentId === target.agentId ? undefined : agentId),
        { newSession: !sessionId }
      );
    } catch (error) {
      captureException(error, {
        detector: 'application-handled',
        operation: 'chat.send',
      });
      toast.danger(parseErrorMessage(error));
      return false;
    } finally {
      sendingComposerKeys.current.delete(composerKey);
    }

    if (!isComposerLive(composerKey)) return false;
    payload.finishSend();
    if (resourceChatContext) clearResourceChatContext?.(resourceChatContext);
    return true;
  };

  const onSend = (text: string, opts?: SendOptions) => {
    const guarded = hostAgentPort?.interceptSend?.(text, opts);
    if (!guarded) return send(text, opts);
    return guarded.then((accepted) => {
      if (!accepted || !isRouteLive(locationKey)) return false;
      return send(text, opts);
    });
  };

  const onCancel = async () => {
    if (!sessionId || !isRouteLive(locationKey)) return;
    try {
      await sessions.withSession(sessionId, (runtime) => runtime.cancel());
    } catch (error) {
      toast.danger(t('input.cancelFailed', { error: parseErrorMessage(error) }));
    }
  };

  const onLoadMoreHistory = async () => {
    if (!sessionId || !isRouteLive(locationKey) || !requireAuth()) return;
    try {
      await sessions.withSession(sessionId, (runtime) => runtime.loadMoreHistory());
    } catch (error) {
      toast.danger(parseErrorMessage(error));
    }
  };

  return {
    currentModel,
    promoteDraftToolSelection: isDraftPromotion,
    ensureSession,
    onSend,
    onCancel,
    onLoadMoreHistory,
  };
}
