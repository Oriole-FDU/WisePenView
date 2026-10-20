import type { Nullable, OptionalPageApiRequest, PageR } from '@/apis/api.type';
import type { ResourceItemApiResponse } from '@/domains/Resource/apis/ResourceApi.type';
import type { UserDisplayBaseApiResponse } from '@/domains/User/apis/UserApi.type';

export interface AddNoteApiRequest {
  title: string;
  resourceType?: string;
  mountTargetTagId?: string;
}

export type AddNoteApiResponse = string;

export interface GetNoteInfoApiRequest {
  resourceId: string;
  targetVersion?: number;
}

export interface GetNoteInfoApiResponse {
  authorsDisplay: Record<string, UserDisplayBaseApiResponse>;
  resourceInfo: ResourceItemApiResponse;
  /** 当前笔记版本号。 */
  version: number;
  /** 笔记最近更新时间，毫秒时间戳。 */
  updateTime: number;
}

export interface GetDrawIoLatestSnapshotApiRequest {
  resourceId: string;
}

export interface GetDrawIoLatestSnapshotApiResponse {
  resourceId: string;
  version: number;
  fullSnapshot: Nullable<string>;
  deltas: string[];
}

export interface SaveDrawIoSnapshotApiRequest {
  resourceId: string;
  version: number;
  data: string;
  plainText?: string;
}

export interface ForkNoteApiRequest {
  resourceId: string;
  forkedResourceVersion?: number;
  forkedResourceName?: string;
}

export interface NoteVersionSummaryApiResponse {
  version: number;
  type: 'FULL' | 'DELTA';
  createdBy: string[];
}

export type ListNoteVersionsApiResponse = PageR<NoteVersionSummaryApiResponse>;

export interface ListNoteVersionsApiRequest extends OptionalPageApiRequest {
  resourceId: string;
}
