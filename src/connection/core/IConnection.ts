/**
 * IConnection is the interface of the connection.
 * It is used to wrap the connection manager and data flow, and provide a unified interface to the upper layer.
 * @example
 * const connection = new NoteConnection('note-1');
 * connection.manager.connect();
 * connection.manager.disconnect();
 * connection.manager.status;
 * connection.manager.isDataFlowAvailable;
 */

import type { ConnectionManager } from './ConnectionManager';
import type { ConnectionDataFlow } from './ConnectionDataFlow';

export interface IConnection<TDataFlow extends ConnectionDataFlow> {
  readonly id: string;
  readonly manager: ConnectionManager;
  readonly dataFlow: TDataFlow;
  dispose(): Promise<void>;
}
