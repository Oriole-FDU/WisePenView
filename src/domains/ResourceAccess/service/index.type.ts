import type { ResourceAction } from '@/domains/_shared/access';

export interface IResourceAccessService {
  getResourcePermissionOverview(
    params: GetResourcePermissionOverviewRequest
  ): Promise<ResourcePermissionOverview>;
  updateResourceActionPermission(params: UpdateResourceActionPermissionRequest): Promise<void>;
  updateResourcePermissionSubjects(params: UpdateResourcePermissionSubjectsRequest): Promise<void>;
}

export type ResourcePermissionResourceType =
  'note' | 'drawio' | 'file' | 'skill' | 'agent' | 'html';

export interface GetResourcePermissionOverviewRequest {
  resourceId: string;
  resourceType: ResourcePermissionResourceType;
  /** 权限概览最多补全的小组数量；超出部分由调用方按需加载。 */
  groupHydrationLimit?: number;
}

export interface UpdateResourceActionPermissionRequest {
  resourceId: string;
  overrideGrantedActions?: Record<string, ResourceAction[] | null> | null;
  specifiedUsersGrantedActions?: Record<string, ResourceAction[]> | null;
}

export interface UpdateResourcePermissionSubjectsRequest {
  resourceId: string;
  subjects: ResourcePermissionSubject[];
}

export type ResourcePermissionSubjectKind = 'owner' | 'group' | 'user';
export type ResourcePermissionSource = 'owner' | 'tag' | 'resourceOverride' | 'specifiedUser';

export interface ResourcePermissionActionOption {
  action: ResourceAction;
  key: string;
  label: string;
  supported: boolean;
}

export interface ResourcePermissionSubject {
  id: string;
  kind: ResourcePermissionSubjectKind;
  source: ResourcePermissionSource;
  name: string;
  description?: string;
  avatar?: string;
  groupId?: string;
  primaryTagId?: string;
  userId?: string;
  effectiveActions: ResourceAction[];
  editableActions: ResourceAction[];
  inheritedActions?: ResourceAction[];
  readonly?: boolean;
}

export interface ResourcePermissionOverview {
  resourceId: string;
  resourceType?: string;
  owner?: ResourcePermissionSubject;
  subjects: ResourcePermissionSubject[];
  supportedActions: ResourceAction[];
  actionOptions: ResourcePermissionActionOption[];
}

/** 权限概览补全所需的用户展示字段，已脱离用户服务的请求协议。 */
export interface ResourcePermissionUserInfo {
  userId: string;
  username: string;
  nickname?: string;
  realName?: string;
  avatar?: string;
}

/** 权限概览补全所需的小组展示字段，已脱离小组服务的请求协议。 */
export interface ResourcePermissionGroupInfo {
  groupId: string;
  groupName: string;
  groupDesc: string;
  groupCoverUrl: string;
}

/** 二次查询结果交给 ResourceAccess mapper 做确定性归并。 */
export interface ResourcePermissionHydration {
  userInfoById: ReadonlyMap<string, ResourcePermissionUserInfo>;
  groupInfoById: ReadonlyMap<string, ResourcePermissionGroupInfo>;
  inheritedActionsBySubjectId: ReadonlyMap<string, ResourceAction[]>;
}
