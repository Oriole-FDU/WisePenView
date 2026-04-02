/**
 * ConnectionStatus is the status of the connection manager fsm.
 */

export type ConnectionStatus =
  | 'idle'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'error'
  | 'disconnecting';
