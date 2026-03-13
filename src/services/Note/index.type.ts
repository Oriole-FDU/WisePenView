/**
 * Note 文档同步相关 API 请求类型
 * 与 blocknote/docs/API.md 对齐
 */

import type { SyncPayload, Block } from '@/types/note';

/** NoteService 接口：供依赖注入使用 */
export interface INoteService {
  /** 增量保存：将一批编辑变更提交到服务端 */
  syncNote(docId: string, payload: SyncPayload): Promise<SyncNoteResponse>;
  /** 全量加载：获取文档的完整内容 */
  loadNote(docId: string): Promise<LoadNoteResponse>;
  /** 新建文档：创建新文档，可传入初始内容 */
  createNote(params?: CreateNoteRequest): Promise<CreateNoteResponse>;
  /** 创建副本：从源文档复制创建新文档 */
  duplicateNote(params: DuplicateNoteRequest): Promise<DuplicateNoteResponse>;
}

/** 增量保存响应 */
export interface SyncNoteResponse {
  /** 应用变更后的文档版本，客户端应更新本地 base_version */
  new_version: number;
}

/** 全量加载响应 */
export interface LoadNoteResponse {
  ok: boolean;
  doc_id: string;
  version: number;
  blocks: Block[];
  updated_at?: string;
}

/** 新建文档请求参数 */
export interface CreateNoteRequest {
  /** 初始 Block 树；不传则创建空文档 */
  initial_content?: Block[];
  /** 文档标题，可由首段内容推断 */
  title?: string;
  /** 源文档 ID，用于从已有文档创建副本；普通创建留空 */
  source?: string;
}

/** 创建副本请求参数 */
export interface DuplicateNoteRequest {
  /** 源文档 ID */
  source: string;
}

/** 新建文档响应 */
export interface CreateNoteResponse {
  ok: boolean;
  doc_id: string;
  version: number;
  blocks: Block[];
  created_at?: string;
}

/** 创建副本响应（与新建文档结构一致） */
export type DuplicateNoteResponse = CreateNoteResponse;
