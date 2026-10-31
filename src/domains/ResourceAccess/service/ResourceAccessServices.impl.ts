import { ResourceItemApi } from '@domain-apis';

import type { ResourceAction } from '@/domains/_shared/access';
import type { IAgentService } from '@/domains/Agent';
import type { IDocumentService } from '@/domains/Document';
import type { GroupBaseInfo, IGroupService } from '@/domains/Group';
import type { IHtmlPageService } from '@/domains/HtmlPage';
import type { INoteService } from '@/domains/Note';
import type { ISkillService } from '@/domains/Skill';
import type { ITagService } from '@/domains/Tag';
import { createClientError, FRONTEND_CLIENT_ERROR } from '@/utils/error';

import { ResourceAccessServicesMap } from '../mapper/ResourceAccessServices.map';
import type {
  GetResourcePermissionOverviewRequest,
  IResourceAccessService,
  ResourcePermissionGroupInfo,
  ResourcePermissionHydration,
  ResourcePermissionOverview,
  UpdateResourceActionPermissionRequest,
  UpdateResourcePermissionSubjectsRequest,
} from './index.type';

interface ResourceAccessServicesDeps {
  agentService: Pick<IAgentService, 'getResourceAccessInfo'>;
  documentService: Pick<IDocumentService, 'getResourceAccessInfo'>;
  groupService: Pick<IGroupService, 'fetchGroupBaseInfo'>;
  htmlPageService: Pick<IHtmlPageService, 'getResourceAccessInfo'>;
  noteService: Pick<INoteService, 'getResourceAccessInfo'>;
  skillService: Pick<ISkillService, 'getResourceAccessInfo'>;
  tagService: Pick<ITagService, 'getTagGrantedActions'>;
}

const PERMISSION_OVERVIEW_HYDRATION_CONCURRENCY = 10;

const normalizePermissionGroupHydrationLimit = (value: number | undefined): number | undefined => {
  if (value === undefined) return undefined;
  return Math.max(0, Math.floor(value));
};

const runWithConcurrency = async <T, R>(
  items: T[],
  concurrency: number,
  worker: (item: T, index: number) => Promise<R>
): Promise<R[]> => {
  const results = new Array<R>(items.length);
  let cursor = 0;

  const runNext = async (): Promise<void> => {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await worker(items[index], index);
    }
  };

  const workerCount = Math.min(Math.max(1, concurrency), items.length);
  await Promise.all(Array.from({ length: workerCount }, () => runNext()));
  return results;
};

const collectPermissionGroupIds = (
  overview: ResourcePermissionOverview,
  limit?: number
): string[] => {
  const groupIds: string[] = [];
  const seenGroupIds = new Set<string>();
  const normalizedLimit = normalizePermissionGroupHydrationLimit(limit);

  for (const subject of overview.subjects) {
    const groupId = subject.groupId;
    if (!groupId || seenGroupIds.has(groupId)) continue;
    groupIds.push(groupId);
    seenGroupIds.add(groupId);
    if (normalizedLimit !== undefined && groupIds.length >= normalizedLimit) break;
  }

  return groupIds;
};

const loadResourceInfo = (
  params: GetResourcePermissionOverviewRequest,
  deps: ResourceAccessServicesDeps
) => {
  switch (params.resourceType) {
    case 'note':
    case 'drawio':
      return deps.noteService.getResourceAccessInfo(params.resourceId);
    case 'file':
      return deps.documentService.getResourceAccessInfo(params.resourceId);
    case 'skill':
      return deps.skillService.getResourceAccessInfo(params.resourceId);
    case 'agent':
      return deps.agentService.getResourceAccessInfo(params.resourceId);
    case 'html':
      return deps.htmlPageService.getResourceAccessInfo(params.resourceId);
    default:
      throw createClientError(FRONTEND_CLIENT_ERROR.INTERNAL_STATE, {
        reason: `不支持权限概览的资源类型：${params.resourceType}`,
      });
  }
};

const loadResourcePermissionOverview = async (
  params: GetResourcePermissionOverviewRequest,
  deps: ResourceAccessServicesDeps
): Promise<ResourcePermissionOverview> => {
  const resourceInfo = await loadResourceInfo(params, deps);
  return ResourceAccessServicesMap.mapResourcePermissionOverviewFromApi(
    resourceInfo,
    params.resourceId
  );
};

const loadPermissionGroupInfo = async (
  groupIds: string[],
  groupService: ResourceAccessServicesDeps['groupService']
): Promise<ReadonlyMap<string, ResourcePermissionGroupInfo>> => {
  if (groupIds.length === 0) return new Map();

  const groupInfos = await runWithConcurrency(
    groupIds,
    PERMISSION_OVERVIEW_HYDRATION_CONCURRENCY,
    (groupId) => groupService.fetchGroupBaseInfo(groupId).catch(() => undefined)
  );
  return new Map(
    groupInfos
      .filter((groupInfo): groupInfo is GroupBaseInfo => Boolean(groupInfo?.groupId))
      .map((groupInfo) => [
        groupInfo.groupId,
        {
          groupId: groupInfo.groupId,
          groupName: groupInfo.groupName,
          groupDesc: groupInfo.groupDesc,
          groupCoverUrl: groupInfo.groupCoverUrl,
        },
      ])
  );
};

const loadPermissionInheritedActions = async (
  overview: ResourcePermissionOverview,
  groupIds: string[],
  tagService: ResourceAccessServicesDeps['tagService']
): Promise<ReadonlyMap<string, ResourceAction[]>> => {
  const groupIdSet = new Set(groupIds);
  const subjectsByGroupId = new Map<string, ResourcePermissionOverview['subjects']>();
  overview.subjects.forEach((subject) => {
    if (!subject.groupId || !subject.primaryTagId || !groupIdSet.has(subject.groupId)) return;
    const subjects = subjectsByGroupId.get(subject.groupId) ?? [];
    subjects.push(subject);
    subjectsByGroupId.set(subject.groupId, subjects);
  });
  if (subjectsByGroupId.size === 0) return new Map();

  const inheritedActionsBySubjectId = new Map<string, ResourceAction[]>();
  await runWithConcurrency(
    Array.from(subjectsByGroupId.entries()),
    PERMISSION_OVERVIEW_HYDRATION_CONCURRENCY,
    async ([groupId, subjects]) => {
      const grantedActionsByTagId = await tagService
        .getTagGrantedActions(groupId)
        .catch(() => undefined);
      if (!grantedActionsByTagId) return;
      subjects.forEach((subject) => {
        const inheritedActions = subject.primaryTagId
          ? grantedActionsByTagId.get(subject.primaryTagId)
          : undefined;
        if (inheritedActions) {
          inheritedActionsBySubjectId.set(subject.id, inheritedActions);
        }
      });
    }
  );
  return inheritedActionsBySubjectId;
};

const enrichResourcePermissionOverview = async (
  overview: ResourcePermissionOverview,
  params: GetResourcePermissionOverviewRequest,
  deps: ResourceAccessServicesDeps
): Promise<ResourcePermissionOverview> => {
  const groupIds = collectPermissionGroupIds(overview, params.groupHydrationLimit);
  const [groupInfoById, inheritedActionsBySubjectId] = await Promise.all([
    loadPermissionGroupInfo(groupIds, deps.groupService),
    loadPermissionInheritedActions(overview, groupIds, deps.tagService),
  ]);
  const userInfoById: ResourcePermissionHydration['userInfoById'] = new Map();
  const hydration: ResourcePermissionHydration = {
    userInfoById,
    groupInfoById,
    inheritedActionsBySubjectId,
  };
  return ResourceAccessServicesMap.mergeResourcePermissionHydration(overview, hydration);
};

const updateResourceActionPermission = async (
  params: UpdateResourceActionPermissionRequest
): Promise<void> => {
  const request = ResourceAccessServicesMap.mapChangeResourceActionPermissionRequest(params);
  await ResourceItemApi.changeResourceActionPermission(request);
};

const updateResourcePermissionSubjects = async (
  params: UpdateResourcePermissionSubjectsRequest
): Promise<void> => {
  const request =
    ResourceAccessServicesMap.mapChangeResourceActionPermissionRequestFromSubjects(params);
  await ResourceItemApi.changeResourceActionPermission(request);
};

/** 组合底层资源能力和小组资料；ResourceCore 不再认识任何资源叶域。 */
export const createResourceAccessServices = (
  deps: ResourceAccessServicesDeps
): IResourceAccessService => ({
  async getResourcePermissionOverview(params) {
    const overview = await loadResourcePermissionOverview(params, deps);
    return enrichResourcePermissionOverview(overview, params, deps);
  },
  updateResourceActionPermission,
  updateResourcePermissionSubjects,
});
