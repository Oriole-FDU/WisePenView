/**
 * Note 同步相关类型定义
 * 与 blocknote/docs/API.md、design-editor-final 对齐
 */

import type { ResourceItem } from './resource';
import type { UserDisplayBase } from './user';

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
export interface NoteChange {
  type: 'insert' | 'update' | 'delete' | 'move';
  block: { id: string } & Record<string, unknown>;
}

/** Block 结构，与 BlockNote 对齐 */
export interface Block {
  id: string;
  type: string;
  props: Record<string, boolean | number | string>;
  content: InlineContent[] | TableContent | undefined;
  children: Block[];
}

/** 行内内容 */
export type InlineContent = StyledText | Link | CustomInlineContent;

export interface StyledText {
  type: 'text';
  text: string;
  styles: Record<string, string>;
}

export interface Link {
  type: 'link';
  content: StyledText[];
  href: string;
}

export interface CustomInlineContent {
  type: string;
  content: StyledText[] | undefined;
  props: Record<string, boolean | number | string>;
}

/** 表格内容占位类型 */
export type TableContent = unknown;

/** Note 元信息（对齐 WisepenCloud noteService 的 NoteInfoBase） */
export interface NoteMetaInfo {
  lastUpdatedAt?: string;
  authors?: UserDisplayBase[];
}

/** 获取 Note 信息返回体（对齐 /note/getNoteInfo） */
export interface NoteInfoResponse {
  resourceInfo: ResourceItem;
  noteInfo: NoteMetaInfo;
}
