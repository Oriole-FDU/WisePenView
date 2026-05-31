import type { Message, Model, MessageRole } from './index.type';
import type { MessageResponse } from '@/domains/Chat';

export const HISTORY_PAGE_SIZE = 100;

export interface ModelMeta {
  provider: string;
  name: string;
}

export interface ParsedLiveMessage {
  content: string;
  reasoningContent: string;
  errorMessage: string;
  toolContent: string;
}

/** 聚合消息正文/推理/工具展示文本，用于判断「是否已有非空白内容」（不含输入框未发送草稿）。 */
export const collectMessagesPlainText = (messageList: Message[]): string =>
  messageList
    .map((message) =>
      [message.content, message.reasoningContent, message.toolContent]
        .filter((chunk): chunk is string => typeof chunk === 'string' && chunk.length > 0)
        .join('\n')
    )
    .join('\n');

export const mapRole = (role: string): MessageRole => {
  if (role === 'user') return 'user';
  return 'ai';
};

export const toTimestamp = (createdAt?: string): number => {
  if (!createdAt) return Date.now();
  const parsed = Date.parse(createdAt);
  return Number.isNaN(parsed) ? Date.now() : parsed;
};

export const getStringValue = (value: unknown): string => {
  if (typeof value === 'string') return value;
  return '';
};

export const pushToolName = (toolNames: string[], toolName: string): void => {
  if (!toolName) return;
  if (toolNames.includes(toolName)) return;
  toolNames.push(toolName);
};

export const getToolNameFromType = (partType: string): string => {
  if (!partType.startsWith('tool-')) return '';
  if (partType === 'tool-input-start') return '';
  if (partType === 'tool-input-available') return '';
  if (partType === 'tool-output-available') return '';
  return partType.slice('tool-'.length);
};

export const getToolNameFromUnknown = (value: unknown): string => {
  if (typeof value !== 'object' || value == null) return '';
  const typedValue = value as {
    toolName?: unknown;
    tool_name?: unknown;
    name?: unknown;
    type?: unknown;
  };
  const toolName =
    getStringValue(typedValue.toolName) ||
    getStringValue(typedValue.tool_name) ||
    getStringValue(typedValue.name);
  if (toolName) return toolName;
  return getToolNameFromType(getStringValue(typedValue.type));
};

export const isSessionInvalidMessage = (message: string): boolean => {
  const normalizedMessage = message.trim().toLowerCase();
  if (!normalizedMessage) return false;
  return (
    normalizedMessage.includes('会话不存在') ||
    normalizedMessage.includes('目标会话不存在') ||
    normalizedMessage.includes('session 不存在') ||
    (normalizedMessage.includes('session') &&
      (normalizedMessage.includes('not exist') ||
        normalizedMessage.includes('not found') ||
        normalizedMessage.includes('invalid')))
  );
};

export const getErrorMessage = (value: unknown): string => {
  if (typeof value === 'string') return value;
  if (typeof value !== 'object' || value == null) return '';
  const typedValue = value as { text?: unknown; message?: unknown; error?: unknown };
  return (
    getStringValue(typedValue.message) ||
    getStringValue(typedValue.text) ||
    getStringValue(typedValue.error)
  );
};

export const parseLiveMessage = (message: unknown): ParsedLiveMessage => {
  if (typeof message !== 'object' || message == null) {
    return { content: '', reasoningContent: '', errorMessage: '', toolContent: '' };
  }

  const typedMessage = message as {
    text?: unknown;
    parts?: unknown;
    content?: unknown;
    reasoning?: unknown;
    error?: unknown;
  };

  const textChunks: string[] = [];
  const reasoningChunks: string[] = [];
  const errorChunks: string[] = [];
  const toolNames: string[] = [];

  if (Array.isArray(typedMessage.parts)) {
    typedMessage.parts.forEach((part) => {
      if (typeof part !== 'object' || part == null) return;
      const typedPart = part as {
        type?: unknown;
        text?: unknown;
        reasoning?: unknown;
        error?: unknown;
        errorText?: unknown;
        message?: unknown;
        toolName?: unknown;
        tool_name?: unknown;
        name?: unknown;
      };

      const partType = getStringValue(typedPart.type);
      const textValue = getStringValue(typedPart.text);

      if (partType === 'text') {
        textChunks.push(textValue);
        return;
      }

      if (partType === 'reasoning') {
        reasoningChunks.push(textValue || getStringValue(typedPart.reasoning));
        return;
      }

      if (partType === 'error') {
        errorChunks.push(
          getErrorMessage(
            typedPart.errorText || typedPart.error || typedPart.message || typedPart.text
          )
        );
        return;
      }

      if (partType.startsWith('tool-')) {
        const toolNameFromType = getToolNameFromType(partType);
        const toolNameFromPayload =
          getStringValue(typedPart.toolName) ||
          getStringValue(typedPart.tool_name) ||
          getStringValue(typedPart.name);
        pushToolName(toolNames, toolNameFromPayload || toolNameFromType);
      }
    });
  }

  const content =
    textChunks.join('') ||
    getStringValue(typedMessage.text) ||
    getStringValue(typedMessage.content);
  const reasoningContent = reasoningChunks.join('') || getStringValue(typedMessage.reasoning);
  const errorMessage = errorChunks.join('') || getErrorMessage(typedMessage.error);
  const toolContent = toolNames.join('\n');

  return { content, reasoningContent, errorMessage, toolContent };
};

export const parseHistoryToolCalls = (
  toolCalls: MessageResponse['tool_calls']
): string | undefined => {
  if (!Array.isArray(toolCalls) || toolCalls.length === 0) return undefined;
  const toolNames: string[] = [];
  toolCalls.forEach((item) => {
    pushToolName(toolNames, getToolNameFromUnknown(item));
  });
  return toolNames.length > 0 ? toolNames.join('\n') : undefined;
};

export const normalizeModelId = (modelId: MessageResponse['model_id']): string | undefined => {
  if (modelId == null) return undefined;
  return String(modelId);
};

export interface MapHistoryMessageContext {
  modelMetaMap: Record<string, ModelMeta>;
  currentModel: Model | null;
}

export const mapHistoryMessage = (
  message: MessageResponse,
  ctx: MapHistoryMessageContext
): Message => {
  const parsedMessage = parseLiveMessage(message);
  const errorMessage = parsedMessage.errorMessage.trim();
  const historyModelId = normalizeModelId(message.model_id);
  const modelMetaFromMap = historyModelId ? ctx.modelMetaMap[historyModelId] : undefined;
  return {
    id: message.id,
    role: mapRole(message.role),
    content: parsedMessage.content || errorMessage || '',
    reasoningContent: parsedMessage.reasoningContent || undefined,
    toolContent: parsedMessage.toolContent || parseHistoryToolCalls(message.tool_calls),
    createAt: toTimestamp(message.createdAt || message.created_at),
    meta: {
      provider: modelMetaFromMap?.provider || ctx.currentModel?.provider || 'openai',
      modelId: historyModelId || ctx.currentModel?.id,
      modelName: modelMetaFromMap?.name || ctx.currentModel?.name,
    },
  };
};

/** 与 useChat 返回的 message 形状对齐的最小字段，供列表映射使用 */
export interface ChatPanelLiveMessageShape {
  id: string | number;
  role: string;
}

export const mapLiveMessagesToPanelMessages = (
  liveMessages: readonly ChatPanelLiveMessageShape[],
  currentModel: Model | null,
  status: string
): Message[] =>
  liveMessages.map((message, index) => {
    const parsedMessage = parseLiveMessage(message);
    const isLastMessage = message.id === liveMessages[liveMessages.length - 1]?.id;
    const errorMessage = parsedMessage.errorMessage.trim();
    const hasError = Boolean(errorMessage);
    const createAt = index;

    return {
      id: String(message.id),
      role: mapRole(String(message.role)),
      content: parsedMessage.content || (hasError ? errorMessage || '生成失败，请重试。' : ''),
      reasoningContent: parsedMessage.reasoningContent || undefined,
      toolContent: parsedMessage.toolContent || undefined,
      createAt,
      loading: isLastMessage && status === 'streaming',
      error: hasError || (isLastMessage && status === 'error'),
      meta: {
        provider: currentModel?.provider || 'openai',
        modelId: currentModel?.id,
        modelName: currentModel?.name,
      },
    };
  });

/** 历史区 + 当前会话 live 区，合并为消息列表展示用的一维数组 */
export const buildPanelMessages = (
  historyMessages: readonly Message[],
  liveMessages: readonly ChatPanelLiveMessageShape[],
  currentModel: Model | null,
  status: string
): Message[] => [
  ...historyMessages,
  ...mapLiveMessagesToPanelMessages(liveMessages, currentModel, status),
];
