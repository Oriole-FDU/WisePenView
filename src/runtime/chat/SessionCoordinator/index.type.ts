import type { CreateSessionRequest } from '@/domains/ChatSession';

import type { SessionRuntime } from '../SessionRuntime/index.type';

export interface SessionCoordinator {
  createSession(params?: CreateSessionRequest): Promise<SessionRuntime>;
  acquire(sessionId: string): Promise<SessionRuntime>;
  dispose(sessionId: string): Promise<void>;
  cleanup(): Promise<void>;
}
