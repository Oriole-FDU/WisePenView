import type { IAgentService } from '@/domains/Agent';
import type { IDocumentService } from '@/domains/Document';
import type { GroupBaseInfo, IGroupService } from '@/domains/Group';
import type { INoteService } from '@/domains/Note';
import type { ISkillService } from '@/domains/Skill';
import type { ITagService } from '@/domains/Tag';

import { type ResourceAction } from '../enum';
import { ResourceServicesMap } from '../mapper/ResourceServices.map';
import type {
  GetResourcePermissionOverviewRequest,
  IResourcePermissionService,
  ResourcePermissionGroupInfo,
  ResourcePermissionHydration,
  ResourcePermissionOverview,
} from './index.type';

interface ResourcePermissionServicesDeps {
  agentService: Pick<IAgentService, 'getAgentPermissionOverview'>;
  documentService: Pick<IDocumentService, 'getDocPermissionOverview'>;
  groupService: Pick<IGroupService, 'fetchGroupBaseInfo'>;
  noteService: Pick<INoteService, 'getNotePermissionOverview'>;
  skillService: Pick<ISkillService, 'getSkillPermissionOverview'>;
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

const loadResourcePermissionOverview = (
  params: GetResourcePermissionOverviewRequest,
  deps: ResourcePermissionServicesDeps
): Promise<ResourcePermissionOverview> => {
  switch (params.resourceType) {
    case 'note':
    case 'drawio':
      return deps.noteService.getNotePermissionOverview(params.resourceId);
    case 'file':
      return deps.documentService.getDocPermissionOverview(params.resourceId);
    case 'skill':
      return deps.skillService.getSkillPermissionOverview(params.resourceId);
    case 'agent':
      return deps.agentService.getAgentPermissionOverview(params.resourceId);
  }
};

const loadPermissionGroupInfo = async (
  groupIds: string[],
  groupService: ResourcePermissionServicesDeps['groupService']
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
  tagService: ResourcePermissionServicesDeps['tagService']
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
  deps: ResourcePermissionServicesDeps
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
  return ResourceServicesMap.mergeResourcePermissionHydration(overview, hydration);
};

/** 组合已装配的领域服务；资源列表与写操作不依赖此查询流程。 */
export const createResourcePermissionServices = (
  deps: ResourcePermissionServicesDeps
): IResourcePermissionService => ({
  async getResourcePermissionOverview(params) {
    const overview = await loadResourcePermissionOverview(params, deps);
    return enrichResourcePermissionOverview(overview, params, deps);
  },
});
