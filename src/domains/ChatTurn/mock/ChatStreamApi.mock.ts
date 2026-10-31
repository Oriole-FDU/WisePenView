import type {
  ChatCompletionApiRequest,
  ChatRecoverApiRequest,
  ChatStreamReconnectApiRequest,
} from '../apis/ChatStreamApi.schema';

const mockSseResponse = (): Promise<Response> =>
  Promise.resolve(
    new Response('data: {"type":"finish"}\n\ndata: [DONE]\n\n', {
      status: 200,
      headers: { 'Content-Type': 'text/event-stream' },
    })
  );

export const streamChatCompletion = (_request: ChatCompletionApiRequest): Promise<Response> =>
  mockSseResponse();

export const streamChatRecovery = (_request: ChatRecoverApiRequest): Promise<Response> =>
  mockSseResponse();

export const reconnectChatStream = (_request: ChatStreamReconnectApiRequest): Promise<Response> =>
  mockSseResponse();
