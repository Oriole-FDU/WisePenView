import { toast } from '@heroui/react';
import { useMemoizedFn } from 'ahooks';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { ChatModel } from '@/domains/ChatConfig';
import type { CreateSessionRequest, WisePenUIMessage } from '@/domains/ChatSession';
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
  const router = useChatRouter();

  const [currentModel, setCurrentModel] = useState<ChatModel | null>(null);
  const pendingHistoryRefreshRef = useRef<string | undefined>(undefined);
  const sendingComposerKeys = useRef(new Set<string>());
  const creatingSessionRef = useRef<{
    locationKey: string;
    promise: Promise<string | undefined>;
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
    if (!isRouteLive(startedLocationKey)) return;
    pendingHistoryRefreshRef.current = createdSessionId;
    await selectSession(createdSessionId, 'promote-draft');
    requestChatSessionHistoryRefresh();
  }

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
        await bindCreatedSessionToRoute(createdSessionId, startedLocationKey);
        if (isComposerLive(startedLocationKey, createdSessionId)) {
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

    sendingComposerKeys.current.add(composerKey);
    try {
      await router.send(text, {
        sessionId,
        create,
        ...payload.options,
        onSessionCreated: (createdSessionId) =>
          bindCreatedSessionToRoute(createdSessionId, locationKey),
      });
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
    promoteDraftToolSelection: isDraftPromotion,
    ensureSession,
    onSend,
    onCancel,
    onLoadMoreHistory,
  };
}
