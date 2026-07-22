import { buildApiUrl } from '@/apis/clientUrls';
import { applyXDeveloperHeader } from '@/apis/developmentTraffic';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { useCallback } from 'react';
import type { ChatMessageMetadata, WisePenUIMessage } from '../entity/message';
import { mapChatCompletionRequest } from '../mapper/chatCompletion.mapper';
import type { SendSessionMessageOptions, UseChatSessionOptions } from './index.type';

const CHAT_COMPLETIONS_API = buildApiUrl('/chat/completions');
const CHAT_STREAM_THROTTLE_MS = 50;

function buildChatFetchInit(init?: RequestInit): RequestInit {
  return {
    ...init,
    credentials: 'include',
    headers: applyXDeveloperHeader(new Headers(init?.headers)),
  };
}

/**
 * 对 useChat 的薄封装：
 * 1) 统一请求地址到 /chat/completions
 * 2) 统一补齐后端 ChatRequest 字段
 * 3) 保留 useChat 原始能力（messages、status、stop 等）
 */
export const useChatSession = ({ sessionId, model }: UseChatSessionOptions) => {
  const chat = useChat<WisePenUIMessage>({
    experimental_throttle: CHAT_STREAM_THROTTLE_MS,
    transport: new DefaultChatTransport<WisePenUIMessage>({
      api: CHAT_COMPLETIONS_API,
      fetch: (input, init) => fetch(input, buildChatFetchInit(init)),
    }),
  });

  const sendSessionMessage = useCallback(
    async (query: string, options?: SendSessionMessageOptions) => {
      const requestBody = mapChatCompletionRequest({
        defaultSessionId: sessionId,
        defaultModel: model,
        query,
        options,
      });
      // 仅用于当次会话 UI；历史回放待后端 listHistoryMessages 透出 metadata
      const uploadedAttachmentSnapshots = (options?.uploadedAttachments ?? [])
        .filter((attachment) => attachment.enabled)
        .map((attachment) => ({
          attachmentId: attachment.attachmentId,
          filename: attachment.filename,
          kind: 'temporary' as const,
          available: true,
        }));
      const resourceAttachmentSnapshots = (options?.selectedResources ?? [])
        .filter((resource) => resource.enabled)
        .map((resource) => ({
          attachmentId: resource.resourceId,
          filename: resource.resourceName,
          kind: 'resource' as const,
          available: true,
        }));
      const selectedAttachments = [...resourceAttachmentSnapshots, ...uploadedAttachmentSnapshots];
      const metadata: ChatMessageMetadata = {
        createdAt: new Date().toISOString(),
        ...(selectedAttachments.length > 0 ? { selectedAttachments } : {}),
      };
      await chat.sendMessage({ text: query, metadata }, { body: requestBody });
    },
    [chat, model, sessionId]
  );

  return {
    ...chat,
    sendSessionMessage,
  };
};
