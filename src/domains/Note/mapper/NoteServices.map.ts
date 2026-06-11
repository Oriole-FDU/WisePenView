import type { NoteInfoResponse } from '@/domains/Note';
import {
  coerceResourceActions,
  maskNoteConfigurableResourceActions,
  RESOURCE_ACTION,
  resourceActionsInclude,
} from '@/domains/Resource';
import { normalizeResourceItem } from '@/domains/Resource/mapper/ResourceServices.map';
import { formatTimestampToDateTime } from '@/utils/format/formatTime';
import { normalizeId } from '@/utils/normalize/normalizeId';
import type {
  CreateNoteResponse,
  NoteInfoDisplayData,
  NotePermissionConfig,
  SyncTitleRequest,
} from '../service/index.type';

const mapSyncTitleRequest = (
  params: SyncTitleRequest
): { resourceId: string; newName: string } => ({
  resourceId: params.resourceId,
  newName: params.newName,
});

const mapCreateNoteFromApi = (resourceId: string): CreateNoteResponse => ({
  resourceId: resourceId || undefined,
});

const mapNoteInfoDisplayFromApi = (data: NoteInfoResponse): NoteInfoDisplayData => {
  // 将后端 ResourceItem 中的 Long 字段归一化为 number
  const resourceInfo = normalizeResourceItem(data.resourceInfo);
  const ownerId = normalizeId(resourceInfo.ownerId) || undefined;
  // authors 可能缺失，按空数组处理
  const authorIds = data.noteInfo.authors ?? [];
  const currentActions = coerceResourceActions(
    resourceInfo.currentActions as unknown[] | undefined
  );
  const authorsById = Object.fromEntries(
    authorIds.map((authorId) => {
      const author = data.authorsDisplay?.[authorId];
      return [
        authorId,
        {
          // fallback：作者展示名缺失时显示未知用户
          name: author?.nickname || author?.realName || '未知用户',
          avatar: author?.avatar,
        },
      ];
    })
  );

  return {
    noteTitle: resourceInfo.resourceName,
    ownerId,
    authors: authorIds.map((authorId) => authorsById[authorId]),
    authorsById,
    // 更新时间缺失时使用占位文案
    lastEditedAtText: formatTimestampToDateTime(data.noteInfo.lastUpdatedAt) || '暂无',
    // 资源实体（已归一化），供展示阅读量/点赞/评分等统计字段
    resourceInfo,
    canCollaborativeEdit: resourceActionsInclude(currentActions, RESOURCE_ACTION.EDIT),
    commentsEnabled: resourceActionsInclude(currentActions, RESOURCE_ACTION.VIEW),
    canEditComments: resourceActionsInclude(currentActions, RESOURCE_ACTION.COMMENT_EDIT),
  };
};

const mapSpecifiedUsersGrantedActionsFromApi = (
  raw: Record<string, unknown[]> | null | undefined
): NotePermissionConfig['specifiedUsersGrantedActions'] => {
  if (!raw) {
    return null;
  }
  const mapped = Object.fromEntries(
    Object.entries(raw).map(([userId, actions]) => [
      userId,
      maskNoteConfigurableResourceActions(coerceResourceActions(actions)),
    ])
  );
  return Object.keys(mapped).length > 0 ? mapped : null;
};

const mapNotePermissionConfigFromApi = (
  data: NoteInfoResponse,
  fallbackResourceId: string
): NotePermissionConfig => {
  const { resourceInfo } = data;
  const overrideGrantedActions = maskNoteConfigurableResourceActions(
    coerceResourceActions(resourceInfo.overrideGrantedActions as unknown[] | undefined)
  );

  return {
    // fallback：缺失 resourceId 时使用请求参数
    resourceId: resourceInfo.resourceId || fallbackResourceId,
    // fallback：无 override 权限时返回 null
    overrideGrantedActions: overrideGrantedActions.length > 0 ? overrideGrantedActions : null,
    specifiedUsersGrantedActions: mapSpecifiedUsersGrantedActionsFromApi(
      resourceInfo.specifiedUsersGrantedActions as Record<string, unknown[]> | undefined
    ),
  };
};

export const NoteServicesMap = {
  mapSyncTitleRequest,
  mapCreateNoteFromApi,
  mapNoteInfoDisplayFromApi,
  mapNotePermissionConfigFromApi,
};
