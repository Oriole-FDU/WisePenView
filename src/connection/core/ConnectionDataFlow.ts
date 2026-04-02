import type { ConnectionManager } from './ConnectionManager';

/**
 * 数据流与传输适配器同生命周期；由 `createConnectionHook` 以 `new DataFlow(adapter, manager)` 创建。
 *
 * 建议在实现内：
 * - 写操作前使用 `manager.isDataFlowAvailable`（或先 `subscribeDataFlowAvailability` 同步到内部状态再判断）；
 * - 若订阅了 `manager`，在可选的 `dispose` 里取消订阅，供连接池释放实例时调用。
 *
 * @example
 * ```ts
 * class NoteDataFlow implements ConnectionDataFlow {
 *   private unsub?: () => void;
 *   constructor(adapter: NoteAdapter, manager: ConnectionManager) {
 *     this.unsub = subscribeDataFlowAvailability(manager, available => {
 *       // 更新内部可写标志、connected 后 flush 缓冲等
 *     });
 *   }
 *   dispose() {
 *     this.unsub?.();
 *   }
 * }
 * ```
 */
export interface ConnectionDataFlow {
  dispose?(): void;
}

/** `DataFlow` 构造签名：第二参数用于监听连接状态并门控写路径。 */
export type ConnectionDataFlowConstructor<TDataFlow extends ConnectionDataFlow, TAdapter> = new (
  adapter: TAdapter,
  manager: ConnectionManager
) => TDataFlow;
