import { useMemo, useSyncExternalStore } from 'react';

import type { ConnectionAdapter } from './ConnectionAdapter';
import type { ConnectionDataFlow, ConnectionDataFlowConstructor } from './ConnectionDataFlow';
import { ConnectionManager } from './ConnectionManager';
import { useEffectForce } from '@/hooks/useEffectForce';

/** The object in the pool needs to be released when the reference is zero */
type DisposableConnection = {
  dispose(): void;
  data: ConnectionDataFlow;
};

/**
 * Reference-counted pool keyed by `instanceId` so the same logical connection can be reused.
 *
 * - `acquire`: if an entry exists, increment `refCount` and return that instance; otherwise create via `factory` and store it.
 * - `release`: decrement `refCount`; when it reaches zero, call the instance's `dispose()` and remove it from the pool.
 *
 * Used by `createConnectionHook` when multiple subscribers share one underlying Adapter/Manager for the same id.
 */
class ConnectionPool {
  private pool = new Map<string, { instance: DisposableConnection; refCount: number }>();

  acquire<T extends DisposableConnection>(id: string, factory: () => T): T {
    const entry = this.pool.get(id);
    if (entry) {
      entry.refCount++;
      return entry.instance as T;
    }
    const instance = factory();
    this.pool.set(id, { instance, refCount: 1 });
    return instance;
  }

  release(id: string) {
    const entry = this.pool.get(id);
    if (!entry) return;
    entry.refCount--;
    if (entry.refCount <= 0) {
      entry.instance.dispose();
      this.pool.delete(id);
    }
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
export function createConnectionHook<
  TDataFlow extends ConnectionDataFlow,
  TAdapter extends ConnectionAdapter,
>(unit: {
  type: string;
  Adapter: new (id: string) => TAdapter;
  DataFlow: ConnectionDataFlowConstructor<TDataFlow, TAdapter>;
}) {
  return (id: string) => {
    const instanceId = `${unit.type}-${id}`;

    // acquire or create instance from internal singleton pool (ref-counted per instanceId)
    const connection = useMemo(
      () =>
        internalPool.acquire(instanceId, () => {
          const adapter = new unit.Adapter(id);
          const manager = new ConnectionManager(adapter);
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
        internalPool.release(instanceId);
      };
    }, [connection, instanceId]);

    return { status, data: connection.data };
  };
}
