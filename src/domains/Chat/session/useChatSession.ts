import { getApiBaseURL } from '@/apis/apiServerAddr';
import { useChatPageStore, useNoteSelectionStore } from '@/store';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { useCallback } from 'react';
import type {
  ChatAgentContext,
  ChatAttachmentRef,
  ChatRequestBody,
  ChatResourceRef,
  ChatState,
  UseChatSessionOptions,
} from './index.type';

// 调用时求值：apiServerAddr 会在生产环境随网络变化运行时切换，固化会失效
const getCompletionsApi = (): string => `${getApiBaseURL()}chat/completions`;

const buildRequestBody = ({
  sessionId,
  query,
  model,
  selected,
  enableSelected,
  activeDocRefs,
  activeAttachments,
  agentContext,
  allowedSkillIds,
  selectedSkillIds,
}: {
  sessionId: string;
  query: string;
  model?: string;
  selected?: string;
  enableSelected?: boolean;
  activeDocRefs?: { resourceId: string; resourceName: string; enabled: boolean }[];
  activeAttachments?: { attachmentId: string; filename: string; enabled: boolean }[];
  agentContext?: ChatAgentContext;
  allowedSkillIds?: string[];
  selectedSkillIds?: string[];
}): ChatRequestBody => {
  const normalizedStates: ChatState[] = [];
  const selectedValue = selected?.trim();

  if (selectedValue) {
    normalizedStates.push({
      key: 'selected_text',
      value: selectedValue,
      disabled: !enableSelected,
    });
  }

  const resourceRefs: ChatResourceRef[] = (activeDocRefs ?? [])
    .filter((r) => r.enabled)
    .map((r) => ({
      resource_id: r.resourceId,
      enabled: r.enabled,
    }));

  const attachmentRefs: ChatAttachmentRef[] = (activeAttachments ?? [])
    .filter((a) => a.enabled)
    .map((a) => ({
      attachment_id: a.attachmentId,
      filename: a.filename,
      enabled: a.enabled,
    }));

  return {
    session_id: sessionId,
    query,
    ...(model ? { model } : {}),
    ...(normalizedStates.length > 0 ? { states: normalizedStates } : {}),
    ...(resourceRefs.length > 0 ? { resource_refs: resourceRefs } : {}),
    ...(attachmentRefs.length > 0 ? { attachment_refs: attachmentRefs } : {}),
    ...(agentContext ? { agent_context: agentContext } : {}),
    ...(allowedSkillIds && allowedSkillIds.length > 0
      ? { allowed_skill_ids: allowedSkillIds }
      : {}),
    ...(selectedSkillIds && selectedSkillIds.length > 0
      ? { selected_skill_ids: selectedSkillIds }
      : {}),
  };
};

/**
 * 对 useChat 的薄封装：
 * 1) 统一请求地址到 /chat/completions
 * 2) 统一补齐 ChatRequest 所需字段（session_id/query/model/states）
 * 3) 通过 enableSelected 控制是否自动注入 selected 到 states
 * 4) 保留 useChat 原始能力（messages、status、stop 等）
 */
export const useChatSession = ({
  sessionId,
  model,
  enableSelected = false,
}: UseChatSessionOptions) => {
  const chat = useChat({
    transport: new DefaultChatTransport({
      api: getCompletionsApi(),
      fetch: (input, init) =>
        fetch(input, {
          ...init,
          credentials: 'include',
        }),
    }),
  });

  const sendSessionMessage = useCallback(
    async (
      query: string,
      options?: {
        model?: string;
        enableSelected?: boolean;
        sessionId?: string;
        agentContext?: ChatAgentContext;
        allowedSkillIds?: string[];
        selectedSkillIds?: string[];
      }
    ) => {
      const targetSessionId = options?.sessionId ?? sessionId;
      const selected = useNoteSelectionStore.getState().selectedTextByResourceId[targetSessionId];
      const chatPageState = useChatPageStore.getState();
      const requestBody = buildRequestBody({
        sessionId: targetSessionId,
        query,
        model: options?.model ?? model,
        selected,
        enableSelected: options?.enableSelected ?? enableSelected,
        activeDocRefs: chatPageState.activeDocRefs,
        activeAttachments: chatPageState.activeAttachments,
        agentContext: options?.agentContext,
        allowedSkillIds: options?.allowedSkillIds,
        selectedSkillIds: options?.selectedSkillIds,
      });
      await chat.sendMessage({ text: query }, { body: requestBody });
    },
    [chat, enableSelected, model, sessionId]
  );

  return {
    ...chat,
    sendSessionMessage,
  };
};
