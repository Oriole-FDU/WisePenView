import { useStore } from 'zustand';

import type { ChatSession } from '../service/index.type';
import { chatSessionCache } from './sessionCache';

export const useChatSessionMetadata = (sessionId?: string): ChatSession | undefined =>
  useStore(chatSessionCache, (state) => (sessionId ? state.sessions.get(sessionId) : undefined));
