import type { OptionalPageApiRequest } from '@/apis/api.type';
import type { ResourceItemApiResponse } from '@/domains/Resource/apis/ResourceApi.type';
import type { UserDisplayBaseApiResponse } from '@/domains/User/apis/UserApi.type';

export interface AddNoteApiRequest {
  title: string;
  resourceType?: string;
  pathTagId?: string;
}

export type AddNoteApiResponse = string;

export interface GetNoteInfoApiRequest {
  resourceId: string;
  targetVersion?: number;
}

export interface NoteMetaInfoApiResponse {
  authors?: string[];
  lastUpdatedAt?: number | string | null;
}

export interface GetNoteInfoApiResponse {
  authorsDisplay?: Record<string, UserDisplayBaseApiResponse> | null;
  resourceInfo: ResourceItemApiResponse;
  /** 当前笔记版本号。 */
  version?: number;
  noteInfo?: NoteMetaInfoApiResponse;
}

export interface GetDrawIoLatestSnapshotApiRequest {
  resourceId: string;
}

export interface GetDrawIoLatestSnapshotApiResponse {
  resourceId: string;
  version: number;
  fullSnapshot?: string | null;
  deltas?: string[] | null;
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

export interface ListNoteVersionsApiRequest extends OptionalPageApiRequest {
  resourceId: string;
}
