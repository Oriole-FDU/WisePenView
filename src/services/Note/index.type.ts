/**
 * Note 文档同步相关 API 请求类型
 * 与 blocknote/docs/API.md 对齐
 */

import type { SyncPayload, Block } from '@/types/note';

/** NoteService 接口：供依赖注入使用 */
/** web-socket服务放在了yjs目录下 */
export interface INoteService {
  syncTitle(params: SyncTitleRequest): Promise<void>;
  /** 新建 / 从源文档派生 Note；占位实现未接后端时返回 ok: false */
  createNote(params: CreateNoteRequest): Promise<CreateNoteResponse>;
}

/** 与 docs/apis/note-api.md「新建文档接口」请求体一致 */
export interface CreateNoteRequest {
  initial_content?: Block[];
  title?: string;
  /** 从已有文档创建副本时传入源文档 ID */
  source?: string;
}

/** 与调用方约定：成功时携带新资源 ID（后端 doc_id 由实现层映射） */
export interface CreateNoteResponse {
  ok: boolean;
  resourceId?: string;
}

export interface SyncTitleRequest {
  resourceId: string;
  newName: string;
}
