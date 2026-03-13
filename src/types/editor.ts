/**
 * Editor 同步相关类型定义
 * 与 blocknote/docs/API.md、design-editor-final 对齐
 */

export type DeltaOp = 'insert' | 'update' | 'delete' | 'move';

export interface JsonDelta {
  op: DeltaOp;
  blockId: string;
  data?: unknown;
  timestamp: number;
  seqId: number;
  /** 首次操作，用于判断块是否本地创建（insert → delete 时直接移除） */
  firstOp?: DeltaOp;
}

export interface SyncPayload {
  base_version?: number;
  send_timestamp: number;
  deltas: JsonDelta[];
}

export interface SendPayload {
  sendTimestamp: number;
  deltas: JsonDelta[];
}

/** BlockNote onChange 的 getChanges() 返回的单项 */
export interface EditorChange {
  type: 'insert' | 'update' | 'delete' | 'move';
  block: { id: string } & Record<string, unknown>;
}
