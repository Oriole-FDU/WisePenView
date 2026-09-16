import type { SpeechApi as SpeechApiContract } from '../apis/SpeechApi';
export const SpeechApi: typeof SpeechApiContract = {
  issueRecognitionCredential: async () => ({
    provider: 'IFLYTEK',
    expires_at: '2099-01-01T00:00:00Z',
    credential: { url: 'wss://speech.example.invalid/mock', common: { app_id: 'mock-app-id' } },
  }),
};
