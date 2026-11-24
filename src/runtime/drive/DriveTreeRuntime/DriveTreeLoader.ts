import { getDriveService, getGroupService } from '@/domains';
import {
  buildDriveNodeScope,
  type DriveContainerNode,
  type DriveNode,
  type DriveNodeChildrenPage,
  type DriveNodeScope,
  type RootNode,
} from '@/domains/Drive';

import type { DriveTreeDataCache } from '../data/driveTreeCache';
import type { DriveTreeRequest } from './index.type';

const GROUP_SCOPE_PAGE_SIZE = 20;

export interface DriveScopePageSource {
  entries: Array<{ scope: DriveNodeScope; groupName?: string }>;
  hasMore: boolean;
}

export class DriveTreeLoader {
  private readonly request: DriveTreeRequest;
  private readonly dataCache: DriveTreeDataCache;

  constructor(request: DriveTreeRequest, dataCache: DriveTreeDataCache) {
    this.request = request;
    this.dataCache = dataCache;
  }

  getRoot(scope: DriveNodeScope): Promise<RootNode> {
    return getDriveService().getRoot({
      rootId: scope.rootId,
      groupId: scope.type === 'group' ? scope.groupId : undefined,
    });
  }

  getPath(scope: DriveNodeScope, nodeId: string, root: RootNode): Promise<DriveNode[]> {
    return nodeId === root.id
      ? Promise.resolve([root])
      : getDriveService().getNodePath({ nodeId, scope });
  }

  async loadChildren(
    parent: DriveContainerNode,
    cursor: string | undefined,
    refresh: boolean
  ): Promise<DriveNodeChildrenPage> {
    const options = {
      scope: parent.scope,
      parentId: parent.id,
      cursor,
      load: this.request.load,
    };
    if (!refresh) {
      const cached = this.dataCache.getChildren(options);
      if (cached) return cached;
    }
    const page = await getDriveService().loadNodeChildren({
      parent,
      cursor,
      pageSize: this.request.load?.pageSize,
      kinds: this.request.load?.kinds ? [...this.request.load.kinds] : undefined,
      resourceType: this.request.load?.resourceType,
      refresh,
    });
    return this.dataCache.setChildren(options, page);
  }

  async fetchScopePage(page: number): Promise<DriveScopePageSource> {
    const result = await getGroupService().fetchGroupList({
      groupRoleFilter: 'ALL',
      page,
      size: GROUP_SCOPE_PAGE_SIZE,
    });
    const excluded = new Set(this.request.excludedGroupIds ?? []);
    const scopeMode = this.request.scopeMode ?? 'single';
    return {
      entries: [
        ...(page === 1 && scopeMode === 'all' ? [{ scope: buildDriveNodeScope() }] : []),
        ...result.groups
          .filter((group) => !excluded.has(group.groupId))
          .map((group) => ({
            scope: buildDriveNodeScope(group.groupId),
            groupName: group.groupName,
          })),
      ],
      hasMore: result.hasMore,
    };
  }
}
