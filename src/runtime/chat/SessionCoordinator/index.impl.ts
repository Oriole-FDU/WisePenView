import { getChatSessionService } from '@/domains';
import type { CreateSessionRequest, IChatSessionService } from '@/domains/ChatSession';
import { createClientError, FRONTEND_CLIENT_ERROR } from '@/utils/error';

import { SessionRuntime } from '../SessionRuntime/index.impl';
import type { SessionRuntime as SessionRuntimeContract } from '../SessionRuntime/index.type';
import type {
  AcquireSessionOptions,
  SessionCoordinator as SessionCoordinatorContract,
} from './index.type';

/** 本轮暂定容量；具体数字与 LFU 参数文档标明可后续调整 */
const DEFAULT_POOL_CAPACITY = 8;

type PoolEntry = {
  runtime: SessionRuntime;
  freq: number;
  lastUsedAt: number;
};

export class SessionCoordinator implements SessionCoordinatorContract {
  private readonly pool = new Map<string, PoolEntry>();
  private readonly capacity: number;
  private readonly chatSessionService: IChatSessionService;

  constructor(capacity = DEFAULT_POOL_CAPACITY) {
    this.capacity = capacity;
    this.chatSessionService = getChatSessionService();
  }

  has(sessionId: string): boolean {
    return this.pool.has(sessionId);
  }

  async createSession(
    params?: CreateSessionRequest,
    options?: AcquireSessionOptions
  ): Promise<SessionRuntimeContract> {
    const session = await this.chatSessionService.createSession(params);
    const retainIds = new Set<string>([session.id]);
    if (options?.retainSessionId) retainIds.add(options.retainSessionId);
    await this.ensureCapacity(retainIds);

    const runtime = new SessionRuntime(session.id);
    await runtime.bootstrap('createSession');
    this.pool.set(session.id, {
      runtime,
      freq: 1,
      lastUsedAt: Date.now(),
    });
    return runtime;
  }

  async acquire(
    sessionId: string,
    options?: AcquireSessionOptions
  ): Promise<SessionRuntimeContract> {
    if (sessionId === '') {
      throw createClientError(FRONTEND_CLIENT_ERROR.INTERNAL_STATE, {
        reason: 'acquire 缺少 sessionId',
      });
    }

    const existing = this.pool.get(sessionId);
    if (existing) {
      this.touch(existing);
      return existing.runtime;
    }

    const retainIds = new Set<string>([sessionId]);
    if (options?.retainSessionId) retainIds.add(options.retainSessionId);

    await this.ensureCapacity(retainIds);

    const runtime = new SessionRuntime(sessionId);
    await runtime.bootstrap('loadSession');
    this.pool.set(sessionId, {
      runtime,
      freq: 1,
      lastUsedAt: Date.now(),
    });
    return runtime;
  }

  async dispose(sessionId: string): Promise<void> {
    const entry = this.pool.get(sessionId);
    if (!entry) return;
    this.pool.delete(sessionId);
    await entry.runtime.cleanup();
  }

  private touch(entry: PoolEntry): void {
    entry.freq += 1;
    entry.lastUsedAt = Date.now();
  }

  private async ensureCapacity(retainIds: ReadonlySet<string>): Promise<void> {
    while (this.pool.size >= this.capacity) {
      const victimId = this.pickLfuVictim(retainIds);
      if (!victimId) return;
      await this.dispose(victimId);
    }
  }

  /** 频率最低优先；同频取最久未用。retainIds 内不可驱逐。 */
  private pickLfuVictim(retainIds: ReadonlySet<string>): string | null {
    let victimId: string | null = null;
    let victim: PoolEntry | null = null;

    for (const [sessionId, entry] of this.pool) {
      if (retainIds.has(sessionId)) continue;
      if (
        !victim ||
        entry.freq < victim.freq ||
        (entry.freq === victim.freq && entry.lastUsedAt < victim.lastUsedAt)
      ) {
        victimId = sessionId;
        victim = entry;
      }
    }

    return victimId;
  }
}
