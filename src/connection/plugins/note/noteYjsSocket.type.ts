/** 与服务端约定的意图埋点操作类型 */
export type NoteIntentOperation = 'COPY' | 'PASTE' | 'UNDO' | 'REDO' | 'KEYBOARD' | 'OTHER';

/**
 * 笔记正文经 Yjs 与云端同步的 WebSocket 侧能力（单人编辑同样走该通道）。
 * 由 {@link NoteAdapter} 内 y-websocket 实例满足；不导出实现类，仅类型契约。
 */
export interface NoteYjsSocket {
  connect(): void;
  disconnect(): void;
  destroy(): void;
  sendIntent(operationType: NoteIntentOperation, source?: string): void;
}
