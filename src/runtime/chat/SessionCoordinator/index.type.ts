import type { CreateSessionRequest } from '@/domains/ChatSession';

import type { SessionRuntime } from '../SessionRuntime/index.type';

export type AcquireSessionOptions = {
  /** 驱逐时保留的 session（通常为当前前台） */
  retainSessionId?: string | null;
};

export interface SessionCoordinator {
  /** 池内是否已有该 runtime */
  has(sessionId: string): boolean;

  /** 显式新建空白会话：BE create + bootstrap(createSession) */
  createSession(
    params?: CreateSessionRequest,
    options?: AcquireSessionOptions
  ): Promise<SessionRuntime>;

  /** 取用已有会话：池命中或冷启动 loadSession */
  acquire(sessionId: string, options?: AcquireSessionOptions): Promise<SessionRuntime>;

  /** 销毁前端 runtime；不 cancel 后端回合 */
  dispose(sessionId: string): Promise<void>;
}
