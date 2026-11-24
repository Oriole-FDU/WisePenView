import type { CreateSessionRequest } from '@/domains/ChatSession';

import type { SessionRuntime } from '../SessionRuntime/index.type';

export type AcquireSessionOptions = {
  retainSessionId?: string | null;
};

export interface SessionCoordinator {
  createSession(
    params?: CreateSessionRequest,
    options?: AcquireSessionOptions
  ): Promise<SessionRuntime>;
  acquire(sessionId: string, options?: AcquireSessionOptions): Promise<SessionRuntime>;
  dispose(sessionId: string): Promise<void>;
  cleanup(): Promise<void>;
}
