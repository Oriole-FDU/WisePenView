/**
 * Note 文档同步相关 API 请求类型
 * 与 blocknote/docs/API.md 对齐
 */

import type { SyncPayload, Block } from '@/types/note';

/** NoteService 接口：供依赖注入使用 */
/** web-socket服务放在了yjs目录下 */
export interface INoteService {
  syncTitle(params: SyncTitleRequest): Promise<void>;
  /** 新建 / 从源文档派生 Note；成功时返回新资源 ID */
  createNote(params: CreateNoteRequest): Promise<CreateNoteResponse>;
  /** 删除 Note（后端会做权限校验并移除资源） */
  deleteNote(params: DeleteNoteRequest): Promise<void>;
  /** 获取可直接渲染的 Note 信息（作者展示 + 编辑时间文案） */
  getNoteInfoDisplay(params: GetNoteInfoRequest): Promise<NoteInfoDisplayData>;
}

export interface NoteInfoDisplayAuthor {
  name: string;
  avatar?: string;
}

export interface NoteInfoDisplayData {
  authors: NoteInfoDisplayAuthor[];
  lastEditedAtText: string;
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
  resourceId?: string;
}

export interface DeleteNoteRequest {
  resourceId: string;
}

export interface SyncTitleRequest {
  resourceId: string;
  newName: string;
}

export interface GetNoteInfoRequest {
  resourceId: string;
}
