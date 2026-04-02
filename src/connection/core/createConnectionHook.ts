import { useMemo, useSyncExternalStore } from 'react';

import type { ConnectionAdapter } from './ConnectionAdapter';
import type { ConnectionDataFlow, ConnectionDataFlowConstructor } from './ConnectionDataFlow';
import { ConnectionManager } from './ConnectionManager';
import type { RetryStrategy } from './RetryStrategies';
import { useEffectForce } from '@/hooks/useEffectForce';

/** The object in the pool needs to be released when the reference is zero */
type DisposableConnection = {
  dispose(): void;
  data: ConnectionDataFlow;
};

type PoolEntry = {
  instance: DisposableConnection;
  refCount: number;
  lingerTimerId?: ReturnType<typeof setTimeout>;
};

/**
 * Reference-counted pool keyed by `instanceId` so the same logical connection can be reused.
 *
 * - `acquire`: if an entry exists, cancel any pending linger dispose, increment `refCount`, return instance; otherwise create via `factory`.
 * - `release`: decrement `refCount`; at zero, either dispose immediately or after `lingerTime` ms if provided.
 *
 * Used by `createConnectionHook` when multiple subscribers share one underlying Adapter/Manager for the same id.
 */
class ConnectionPool {
  private pool = new Map<string, PoolEntry>();

  acquire<T extends DisposableConnection>(id: string, factory: () => T): T {
    const entry = this.pool.get(id);
    if (entry) {
      if (entry.lingerTimerId !== undefined) {
        clearTimeout(entry.lingerTimerId);
        entry.lingerTimerId = undefined;
      }
      entry.refCount++;
      return entry.instance as T;
    }
    const instance = factory();
    this.pool.set(id, { instance, refCount: 1 });
    return instance;
  }

  release(id: string, lingerTimeMs?: number) {
    const entry = this.pool.get(id);
    if (!entry) return;
    entry.refCount--;
    if (entry.refCount > 0) return;

    const linger = lingerTimeMs !== undefined && lingerTimeMs > 0 ? lingerTimeMs : 0;
    if (linger > 0) {
      entry.lingerTimerId = setTimeout(() => {
        const current = this.pool.get(id);
        if (!current || current.refCount > 0) return;
        current.instance.dispose();
        this.pool.delete(id);
      }, linger);
      return;
    }

    entry.instance.dispose();
    this.pool.delete(id);
  }
}

const internalPool = new ConnectionPool();

/**
 * createConnectionHook is the hook to create a connection.
 * It is used to create a connection and return the status and data flow.
 * @example
 * const { status, data } = createConnectionHook('note-1');
 * status;
 * data;
 */
export type ConnectionUnitConfig = {
  retryStrategy?: RetryStrategy;
  /** When last subscriber unmounts, delay dispose by this many ms so quick remounts reuse the same connection. */
  lingerTime?: number;
};

export function createConnectionHook<
  TDataFlow extends ConnectionDataFlow,
  TAdapter extends ConnectionAdapter,
>(unit: {
  type: string;
  Adapter: new (id: string) => TAdapter;
  DataFlow: ConnectionDataFlowConstructor<TDataFlow, TAdapter>;
  config?: ConnectionUnitConfig;
}) {
  const lingerTime = unit.config?.lingerTime;
  const retryStrategy = unit.config?.retryStrategy;

  return (id: string) => {
    const instanceId = `${unit.type}-${id}`;

    // acquire or create instance from internal singleton pool (ref-counted per instanceId)
    const connection = useMemo(
      () =>
        internalPool.acquire(instanceId, () => {
          const adapter = new unit.Adapter(id);
          const manager = new ConnectionManager(adapter, retryStrategy);
          const data = new unit.DataFlow(adapter, manager);
          return {
            manager,
            data,
            dispose: () => {
              data.dispose?.();
              void manager.disconnect();
            },
          };
        }),
      [instanceId, id]
    );

    // reactive status handling
    const status = useSyncExternalStore(
      connection.manager.subscribe,
      () => connection.manager.status
    );

    // when the hook is mounted, connect the connection
    // when the hook is unmounted, disconnect the connection
    // we don't want to depend on ahooks in this core, so we use a useEffectForce.
    useEffectForce(() => {
      void connection.manager.connect();
      return () => {
        internalPool.release(instanceId, lingerTime);
      };
    }, [connection, instanceId, lingerTime]);

    return { status, data: connection.data };
  };
}
