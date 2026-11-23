import { toast } from '@heroui/react';
import { useMemoizedFn } from 'ahooks';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { ChatModel } from '@/domains/ChatConfig';
import type { CreateSessionRequest, WisePenUIMessage } from '@/domains/ChatSession';
import { useChatSessionRoute } from '@/hooks/useChatSessionRoute';
import { useChatSessionHistoryRefreshStore } from '@/layouts/AppLayout/_store/useChatSessionHistoryRefreshStore';
import { captureException } from '@/observability';
import { buildSessionSendPayload, getChatRouter } from '@/runtime/chat';
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
  const { selectSession } = useChatSessionRoute();
  const requestChatSessionHistoryRefresh = useChatSessionHistoryRefreshStore(
    (state) => state.requestRefresh
  );
  const { locationKey, locationKeyLatest, requireAuth, isRouteLive } = useChatGuards();
  const router = getChatRouter();

  const [currentModel, setCurrentModel] = useState<ChatModel | null>(null);
  const [cancelling, setCancelling] = useState(false);
  /** 本面板创建的草稿会话；路由离开后在渲染期对齐清掉。 */
  const [draftSessionId, setDraftSessionId] = useState<string>();
  const pendingHistoryRefreshRef = useRef<string | undefined>(undefined);
  const creatingSessionRef = useRef<{
    locationKey: string;
    promise: Promise<string | undefined>;
  } | null>(null);

  if (draftSessionId !== undefined && sessionId !== draftSessionId) {
    setDraftSessionId(undefined);
  }

  const resourceStateProvider = resourceChat?.provider;
  const resourceChatContext = resourceChat?.context;
  const clearResourceChatContext = resourceChat?.clearContext;
  const promoteDraftToolSelection = sessionId !== undefined && sessionId === draftSessionId;

  useRefreshHistoryOnFirstContent(
    sessionId,
    messages,
    pendingHistoryRefreshRef,
    requestChatSessionHistoryRefresh
  );

  const bindCreatedSessionToRoute = useMemoizedFn(async (createdSessionId: string) => {
    if (!isRouteLive(locationKey)) return;
    setDraftSessionId(createdSessionId);
    pendingHistoryRefreshRef.current = createdSessionId;
    await selectSession(createdSessionId, true);
    requestChatSessionHistoryRefresh();
  });

  const ensureSession = useMemoizedFn(async (): Promise<string | undefined> => {
    if (!isRouteLive(locationKey)) return;
    if (!requireAuth()) {
      throw createClientError(FRONTEND_CLIENT_ERROR.INTERNAL_STATE, {
        reason: t('input.loginRequired'),
      });
    }
    if (sessionId) return sessionId;

    if (creatingSessionRef.current?.locationKey !== locationKey) {
      const promise = (async () => {
        await router.createSession();
        const createdSessionId = router.getSnapshot().sessionId;
        if (!createdSessionId) return;
        await bindCreatedSessionToRoute(createdSessionId);
        return createdSessionId;
      })();
      creatingSessionRef.current = { locationKey, promise };
      const clearPending = () => {
        if (creatingSessionRef.current?.promise === promise) creatingSessionRef.current = null;
      };
      void promise.then(clearPending, clearPending);
    }
    return creatingSessionRef.current.promise;
  });

  const send = async (text: string, opts?: SendOptions): Promise<boolean> => {
    const startedLocationKey = locationKey;
    if (!isRouteLive(startedLocationKey) || !requireAuth()) return false;

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
    let create: CreateSessionRequest | undefined;
    if (selectedAgent?.resourceId) {
      create = { agentId: selectedAgent.resourceId };
    } else if (selectedAgent?.isDefault || selectedAgent?.source === 'DEFAULT') {
      create = { agentId: null };
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

    try {
      if (sessionId && router.getSnapshot().sessionId !== sessionId) {
        await router.focusSession(sessionId);
      }
      if (!isRouteLive(startedLocationKey)) return false;
      const hadForeground = Boolean(router.getSnapshot().sessionId);
      await router.send(text, {
        create,
        ...payload.options,
      });
      if (!isRouteLive(startedLocationKey)) return false;
      const createdSessionId = router.getSnapshot().sessionId;
      if (!hadForeground && createdSessionId) {
        await bindCreatedSessionToRoute(createdSessionId);
      }
    } catch (error) {
      captureException(error, {
        detector: 'application-handled',
        operation: 'chat.send',
      });
      toast.danger(parseErrorMessage(error));
      return false;
    }

    payload.finishSend();
    if (resourceChatContext) clearResourceChatContext?.(resourceChatContext);
    return true;
  };

  const onSend = (text: string, opts?: SendOptions) => {
    const guarded = hostAgentPort?.interceptSend?.(text, opts);
    if (!guarded) return send(text, opts);
    const pendingLocationKey = locationKeyLatest.current;
    return guarded.then((accepted) => {
      if (!accepted || !isRouteLive(pendingLocationKey)) return false;
      return send(text, opts);
    });
  };

  const onCancel = async () => {
    if (!sessionId || cancelling) return;
    setCancelling(true);
    try {
      await router.cancel();
    } catch (error) {
      toast.danger(t('input.cancelFailed', { error: parseErrorMessage(error) }));
    } finally {
      setCancelling(false);
    }
  };

  const onLoadMoreHistory = async () => {
    if (!requireAuth()) return;
    try {
      await router.loadMoreHistory();
    } catch (error) {
      toast.danger(parseErrorMessage(error));
    }
  };

  return {
    currentModel,
    cancelling,
    promoteDraftToolSelection,
    ensureSession,
    onSend,
    onCancel,
    onLoadMoreHistory,
  };
}
