import { startTransition, useState } from 'react';

import { useDriveService } from '@/domains';
import type { DriveContainerNode, DriveNode, DriveNodeScope } from '@/domains/Drive';
import { useApi } from '@/hooks/useApi';
import { createClientError, FRONTEND_CLIENT_ERROR } from '@/utils/error';

import type { DriveViewNode } from './driveComponentModel';
import { useDrivePagedTreeChildren } from './useDrivePagedTreeChildren';

const DRIVE_BROWSER_RESOURCE_PAGE_SIZE = 50;

interface UseDriveBrowserControllerParams {
  initialNodeId?: string;
  scope: DriveNodeScope;
  ready?: boolean;
  onPathError?: (error: unknown) => void;
  getExpandedNodeIdsToRestore?: (locationKey: string) => Set<string> | null;
  onExpandedNodeIdsRestored?: (locationKey: string, nodeIds: string[]) => void;
}

interface DrivePathResult {
  locationKey: string;
  nodes: DriveNode[];
}

interface DriveRowsResult {
  locationKey: string;
  parent: DriveContainerNode;
  rows: DriveViewNode[];
  totalCount: number;
  restoredExpandedNodeIds: string[];
}

const isContainer = (node: DriveViewNode): node is DriveContainerNode =>
  node.type === 'root' || node.type === 'folder';

export function useDriveBrowserController({
  initialNodeId,
  scope,
  ready = true,
  onPathError,
  getExpandedNodeIdsToRestore,
  onExpandedNodeIdsRestored,
}: UseDriveBrowserControllerParams) {
  const driveService = useDriveService();
  const rootId = scope.rootId;
  const groupId = scope.type === 'group' ? scope.groupId : undefined;
  const {
    childrenMap,
    pageStateMap,
    getPageState,
    loadChildren,
    loadMoreChildren: loadMorePagedChildren,
    reset,
  } = useDrivePagedTreeChildren({
    pageSize: DRIVE_BROWSER_RESOURCE_PAGE_SIZE,
    loadPage: async ({ parent, cursor, pageSize, refresh }) => {
      const result = await driveService.loadNodeChildren({
        parent,
        cursor,
        pageSize,
        refresh,
      });
      return {
        nodes: [...result.folderNodes, ...result.resourceNodes],
        total: result.total,
        nextCursor: result.nextCursor,
      };
    },
    countLoaded: (children) =>
      children.filter((node) => node.type === 'resource' || node.type === 'link').length,
  });

  const navigationKey = `${rootId}\u0000${initialNodeId ?? ''}`;
  const initialCurrentNodeId = initialNodeId ?? rootId;
  const [currentLocation, setCurrentLocation] = useState({
    navigationKey,
    nodeId: initialCurrentNodeId,
  });
  const currentNodeId =
    currentLocation.navigationKey === navigationKey ? currentLocation.nodeId : initialCurrentNodeId;
  const [rows, setRows] = useState<DriveViewNode[]>([]);
  const [currentParent, setCurrentParent] = useState<DriveContainerNode>();
  const [totalCount, setTotalCount] = useState(0);
  const locationKey = `${navigationKey}\u0000${currentNodeId}`;

  const resolveCurrentParent = async (): Promise<DriveContainerNode> => {
    if (currentNodeId === rootId) {
      return driveService.getRoot({ rootId, groupId });
    }
    const path = await driveService.getNodePath({ nodeId: currentNodeId, scope });
    const node = path.at(-1);
    if (!node || !isContainer(node)) {
      throw createClientError(FRONTEND_CLIENT_ERROR.DRIVE_NODE_NOT_FOUND, {
        nodeId: currentNodeId,
      });
    }
    return node;
  };

  const { loading, refresh } = useApi(
    async (): Promise<DriveRowsResult> => {
      const expandedNodeIdsToRestore = getExpandedNodeIdsToRestore?.(locationKey);
      reset();
      const parent = await resolveCurrentParent();
      const nextRows = await loadChildren(parent, { refresh: true });
      const pageState = getPageState(parent.id);
      if (!expandedNodeIdsToRestore?.size) {
        return {
          locationKey,
          parent,
          rows: nextRows,
          totalCount: pageState?.total ?? nextRows.length,
          restoredExpandedNodeIds: [],
        };
      }

      const restoredExpandedNodeIds: string[] = [];
      const reloadExpandedChildren = async (nodes: DriveViewNode[]): Promise<void> => {
        await Promise.all(
          nodes.filter(isContainer).map(async (node) => {
            if (!expandedNodeIdsToRestore.has(node.id)) return;
            restoredExpandedNodeIds.push(node.id);
            const children = await loadChildren(node);
            await reloadExpandedChildren(children);
          })
        );
      };
      await reloadExpandedChildren(nextRows);
      return {
        locationKey,
        parent,
        rows: nextRows,
        totalCount: pageState?.total ?? nextRows.length,
        restoredExpandedNodeIds,
      };
    },
    {
      ready,
      refreshDeps: [currentNodeId, groupId, rootId],
      onSuccess: (result) => {
        setCurrentParent(result.parent);
        setRows(result.rows);
        setTotalCount(result.totalCount);
        onExpandedNodeIdsRestored?.(result.locationKey, result.restoredExpandedNodeIds);
      },
      showErrorToast: false,
      onErrorEffect: (error) => {
        if (onPathError) onPathError(error);
      },
    }
  );

  const { loading: loadingMore, run: loadMore } = useApi(
    async () => {
      if (!currentParent) return [];
      return loadMorePagedChildren(currentParent);
    },
    {
      manual: true,
      onSuccess: (nextRows) => setRows(nextRows),
    }
  );

  const { data: pathResult } = useApi(
    async (): Promise<DrivePathResult> => ({
      locationKey,
      nodes: await driveService.getNodePath({ nodeId: currentNodeId, scope }),
    }),
    {
      ready,
      refreshDeps: [currentNodeId, groupId],
      showErrorToast: !onPathError,
      onErrorEffect: (err) => {
        if (onPathError) {
          onPathError(err);
          return;
        }
        if (currentNodeId !== rootId) setCurrentLocation({ navigationKey, nodeId: rootId });
      },
    }
  );

  const currentPageState = currentParent ? pageStateMap.get(currentParent.id) : undefined;
  const pathNodes = pathResult?.locationKey === locationKey ? pathResult.nodes : [];

  const enterFolder = (nodeId: string) => {
    startTransition(() => setCurrentLocation({ navigationKey, nodeId }));
  };

  return {
    childrenMap,
    currentNodeId,
    currentParent,
    rows,
    totalCount,
    pathNodes,
    loading: !ready || loading,
    loadingMore,
    hasMore: Boolean(currentPageState?.cursor),
    loadMore,
    loadChildren,
    loadMoreChildren: loadMorePagedChildren,
    enterFolder,
    refresh,
  };
}
