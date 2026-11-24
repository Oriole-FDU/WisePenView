import { toast } from '@heroui/react';
import { useLatest, useMemoizedFn } from 'ahooks';
import { useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { useTranslation } from 'react-i18next';

import type { ChatModel } from '@/domains/ChatConfig';
import type { CreateSessionRequest, WisePenUIMessage } from '@/domains/ChatSession';
import { useChatSessionRoute } from '@/hooks/useChatSessionRoute';
import { useChatSessionHistoryRefreshStore } from '@/layouts/AppLayout/_store/useChatSessionHistoryRefreshStore';
import { captureException } from '@/observability';
import { buildSessionSendPayload, useChatRouter } from '@/runtime/chat';
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
  const sessionIdLatest = useLatest(sessionId);
  const router = useChatRouter();

  const [currentModel, setCurrentModel] = useState<ChatModel | null>(null);
  const [draftSession, setDraftSession] = useState<{ id: string; locationKey: string }>();
  const pendingHistoryRefreshRef = useRef<string | undefined>(undefined);
  const sendingLocationRef = useRef<string | undefined>(undefined);
  const creatingSessionRef = useRef<{
    locationKey: string;
    promise: Promise<string | undefined>;
  } | null>(null);

  if (draftSession && sessionId !== draftSession.id && locationKey !== draftSession.locationKey) {
    setDraftSession(undefined);
  }

  const resourceStateProvider = resourceChat?.provider;
  const resourceChatContext = resourceChat?.context;
  const clearResourceChatContext = resourceChat?.clearContext;
  const promoteDraftToolSelection = draftSession !== undefined && sessionId === draftSession.id;

  useRefreshHistoryOnFirstContent(
    sessionId,
    messages,
    pendingHistoryRefreshRef,
    requestChatSessionHistoryRefresh
  );

  const bindCreatedSessionToRoute = useMemoizedFn(
    async (createdSessionId: string, startedLocationKey: string) => {
      if (!isRouteLive(startedLocationKey)) return;
      flushSync(() => setDraftSession({ id: createdSessionId, locationKey: startedLocationKey }));
      pendingHistoryRefreshRef.current = createdSessionId;
      await selectSession(createdSessionId, true);
      requestChatSessionHistoryRefresh();
      if (sessionIdLatest.current === createdSessionId && isRouteLive(locationKeyLatest.current)) {
        return locationKeyLatest.current;
      }
    }
  );

  const ensureSession = useMemoizedFn(async (): Promise<string | undefined> => {
    if (!isRouteLive(locationKey)) return;
    if (!requireAuth()) {
      throw createClientError(FRONTEND_CLIENT_ERROR.INTERNAL_STATE, {
        reason: t('input.loginRequired'),
      });
    }
    if (sessionId) return sessionId;

    if (creatingSessionRef.current?.locationKey !== locationKey) {
      const startedLocationKey = locationKey;
      const promise = (async () => {
        const createdSessionId = await router.createSession();
        if (!createdSessionId) return;
        if ((await bindCreatedSessionToRoute(createdSessionId, startedLocationKey)) !== undefined) {
          return createdSessionId;
        }
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
    if (sendingLocationRef.current === startedLocationKey) return false;
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

    sendingLocationRef.current = startedLocationKey;
    let boundLocationKey: string | undefined;
    try {
      await router.send(text, {
        sessionId,
        create,
        ...payload.options,
        onSessionCreated: async (createdSessionId) => {
          boundLocationKey = await bindCreatedSessionToRoute(createdSessionId, startedLocationKey);
          if (boundLocationKey && sendingLocationRef.current === startedLocationKey) {
            sendingLocationRef.current = boundLocationKey;
          }
        },
      });
    } catch (error) {
      captureException(error, {
        detector: 'application-handled',
        operation: 'chat.send',
      });
      toast.danger(parseErrorMessage(error));
      return false;
    } finally {
      if (sendingLocationRef.current === (boundLocationKey ?? startedLocationKey)) {
        sendingLocationRef.current = undefined;
      }
    }

    if (!isRouteLive(boundLocationKey ?? startedLocationKey)) return false;
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
    if (!sessionId || !isRouteLive(locationKey)) return;
    try {
      await router.cancel(sessionId);
    } catch (error) {
      toast.danger(t('input.cancelFailed', { error: parseErrorMessage(error) }));
    }
  };

  const onLoadMoreHistory = async () => {
    if (!sessionId || !isRouteLive(locationKey) || !requireAuth()) return;
    try {
      await router.loadMoreHistory(sessionId);
    } catch (error) {
      toast.danger(parseErrorMessage(error));
    }
  };

  return {
    currentModel,
    promoteDraftToolSelection,
    ensureSession,
    onSend,
    onCancel,
    onLoadMoreHistory,
  };
}
