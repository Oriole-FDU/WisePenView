import type { ChatCompletionApiRequest, ChatRecoverApiRequest } from '../apis/ChatStreamApi.schema';

export interface IChatService {
  streamChatCompletion(request: ChatCompletionApiRequest, signal?: AbortSignal): Promise<Response>;
  recoverChatStream(request: ChatRecoverApiRequest, signal?: AbortSignal): Promise<Response>;
  reconnectChatStream(sessionId: string, signal?: AbortSignal): Promise<Response>;
  getActiveTurnId(sessionId: string): Promise<string | null>;
  cancelTurn(sessionId: string): Promise<void>;
}
