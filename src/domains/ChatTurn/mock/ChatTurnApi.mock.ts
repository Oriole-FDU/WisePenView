import type { ChatTurnApi as ChatTurnApiContract } from '../apis/ChatTurnApi';

const mockSseResponse = (): Promise<Response> =>
  Promise.resolve(
    new Response('data: {"type":"finish"}\n\ndata: [DONE]\n\n', {
      status: 200,
      headers: { 'Content-Type': 'text/event-stream' },
    })
  );

export const ChatTurnApi: typeof ChatTurnApiContract = {
  getActiveTurn: async () => ({ turn_id: null }),
  cancelTurn: async () => undefined,
  respondTurn: async () => undefined,
  streamChatCompletion: async () => mockSseResponse(),
  streamChatRecovery: async () => mockSseResponse(),
  reconnectChatStream: async () => mockSseResponse(),
};
