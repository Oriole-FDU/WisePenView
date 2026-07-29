/**
 * Note 文档同步相关 API 请求类型
 * 与 blocknote/docs/API.md 对齐
 */

import type { Block, NoteAiDiffPreviewData } from '@/domains/Note';
import type { ResourceItem } from '@/domains/Resource';

/** NoteService 接口：供依赖注入使用 */
/** web-socket服务放在了yjs目录下 */
export interface INoteService {
  syncTitle(params: SyncTitleRequest): Promise<void>;
  /** 新建 / 从源文档派生 Note；成功时返回新资源 ID */
  createNote(params: CreateNoteRequest): Promise<CreateNoteResponse>;
  /** 获取可直接渲染的 Note 信息（作者展示 + 编辑时间文案） */
  getNoteInfoDisplay(params: GetNoteInfoRequest): Promise<NoteInfoDisplayData>;
  /** 获取 DRAWIO 最新完整快照 */
  getDrawIoLatestSnapshot(
    params: GetDrawIoLatestSnapshotRequest
  ): Promise<DrawIoLatestSnapshotData>;
  /** 保存 DRAWIO 完整 XML 快照 */
  saveDrawIoSnapshot(params: SaveDrawIoSnapshotRequest): Promise<void>;
  /** 复制 NOTE/DRAWIO 资源 */
  forkNote(params: ForkNoteRequest): Promise<ForkNoteResponse>;
  /** 查询 NOTE/DRAWIO 版本摘要列表 */
  listNoteVersions(params: ListNoteVersionsRequest): Promise<NoteVersionListPage>;
}

export interface NoteInfoDisplayAuthor {
  id: string;
  name: string;
  avatar?: string;
}

export interface NoteInfoDisplayData {
  noteTitle: string;
  ownerId?: string;
  authors: NoteInfoDisplayAuthor[];
  lastEditedAtText: string;
  /** 资源实体，供展示阅读量/点赞/评分等统计字段 */
  resourceInfo?: ResourceItem;
  /** 当前内容版本号 */
  version?: number;
  /** 当前用户是否具备协同编辑（EDIT）权限 */
  canCollaborativeEdit: boolean;
  /** 仅 Mock service 提供，用真实编辑器与 sidecar 链路展示 AI Diff。 */
  aiDiffPreview?: NoteAiDiffPreviewData;
}

/** 与 docs/apis/note-api.md「新建文档接口」请求体一致 */
export interface CreateNoteRequest {
  initial_content?: Block[];
  title: string;
  resourceType?: 'NOTE' | 'DRAWIO';
  pathTagId?: string;
  /** 从已有文档创建副本时传入源文档 ID */
  source?: string;
}

/** 与调用方约定：成功时携带新资源 ID（后端 doc_id 由实现层映射） */
export interface CreateNoteResponse {
  resourceId?: string;
}

export interface SyncTitleRequest {
  resourceId: string;
  newName: string;
}

export interface GetNoteInfoRequest {
  resourceId: string;
}

export interface GetDrawIoLatestSnapshotRequest {
  resourceId: string;
}

export interface DrawIoLatestSnapshotData {
  resourceId: string;
  version: number;
  fullSnapshot?: string | null;
  deltas?: string[] | null;
}

export interface SaveDrawIoSnapshotRequest {
  resourceId: string;
  version: number;
  xml: string;
  plainText?: string;
}

export interface ForkNoteRequest {
  resourceId: string;
  forkedResourceVersion?: number;
  forkedResourceName?: string;
}

export interface ForkNoteResponse {
  resourceId?: string;
}

export interface ListNoteVersionsRequest {
  resourceId: string;
  page?: number;
  size?: number;
}

export interface NoteVersionSummary {
  version?: number;
  type?: 'FULL' | 'DELTA' | string;
  createdBy?: number[];
}

export interface NoteVersionListPage {
  list: NoteVersionSummary[];
  total: number;
  page: number;
  size: number;
  totalPage: number;
}
