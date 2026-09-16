import { startTransition, useRef, useState } from 'react';

import { useDriveService } from '@/domains';
import type { DriveContainerNode, DriveNode, DriveNodeScope } from '@/domains/Drive';
import { useApi } from '@/hooks/useApi';
import { createClientError, FRONTEND_CLIENT_ERROR } from '@/utils/error';
import { findTreeNodeById } from '@/utils/tree/findTreeNodeById';

import type { DriveViewNode } from '../../common/driveComponentModel';
import { useDrivePagedTreeChildren } from '../../common/useDrivePagedTreeChildren';
import type { DriveRow } from '../index.type';

const TABLE_DRIVE_RESOURCE_PAGE_SIZE = 50;

interface UseTableDriveNavigationControllerParams {
  initialNodeId?: string;
  scope: DriveNodeScope;
  ready?: boolean;
  onPathError?: (error: unknown) => void;
}

interface UseTableDriveNavigationControllerReturn {
  currentNodeId: string;
  dataSource: DriveRow[];
  totalCount: number;
  pathNodes: DriveNode[];
  loading: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  expandedRowKeys: string[];
  loadMore: () => void;
  loadMoreChildren: (nodeId: string) => Promise<void>;
  enterFolder: (nodeId: string) => void;
  handleExpandedChange: (keys: string[]) => Promise<void>;
  refresh: () => void;
}

interface DrivePathResult {
  locationKey: string;
  nodes: DriveNode[];
}

interface DriveRowsResult {
  locationKey: string;
  parent: DriveContainerNode;
  rows: DriveRow[];
  expandedRowKeys: string[];
  totalCount: number;
  hasMore: boolean;
}

const isContainer = (node: DriveViewNode): node is DriveContainerNode =>
  node.type === 'root' || node.type === 'folder';

export function useTableDriveNavigationController({
  initialNodeId,
  scope,
  ready = true,
  onPathError,
}: UseTableDriveNavigationControllerParams): UseTableDriveNavigationControllerReturn {
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
    pageSize: TABLE_DRIVE_RESOURCE_PAGE_SIZE,
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
  const [rows, setRows] = useState<DriveRow[]>([]);
  const [currentParent, setCurrentParent] = useState<DriveContainerNode>();
  const [expandedRowKeys, setExpandedRowKeys] = useState<string[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const expandedRowKeysRef = useRef<string[]>([]);
  const loadedLocationKeyRef = useRef<string | undefined>(undefined);
  const locationKey = `${navigationKey}\u0000${currentNodeId}`;

  const updateExpandedRowKeys = (updater: string[] | ((keys: string[]) => string[])) => {
    const nextKeys = typeof updater === 'function' ? updater(expandedRowKeysRef.current) : updater;
    expandedRowKeysRef.current = nextKeys;
    setExpandedRowKeys(nextKeys);
  };

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
      const expandedKeysToRestore =
        loadedLocationKeyRef.current === locationKey ? new Set(expandedRowKeysRef.current) : null;
      reset();
      const parent = await resolveCurrentParent();
      const nextRows = (await loadChildren(parent, { refresh: true })) as DriveRow[];
      const pageState = getPageState(parent.id);
      if (!expandedKeysToRestore?.size) {
        return {
          locationKey,
          parent,
          rows: nextRows,
          expandedRowKeys: [],
          totalCount: pageState?.total ?? nextRows.length,
          hasMore: Boolean(pageState?.cursor),
        };
      }

      const restoredExpandedKeys: string[] = [];
      const reloadExpandedChildren = async (nodes: DriveViewNode[]): Promise<void> => {
        await Promise.all(
          nodes.filter(isContainer).map(async (node) => {
            if (!expandedKeysToRestore.has(node.id)) return;
            restoredExpandedKeys.push(node.id);
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
        expandedRowKeys: restoredExpandedKeys,
        totalCount: pageState?.total ?? nextRows.length,
        hasMore: Boolean(pageState?.cursor),
      };
    },
    {
      ready,
      refreshDeps: [currentNodeId, groupId, rootId],
      onBefore: () => {
        if (loadedLocationKeyRef.current !== locationKey) updateExpandedRowKeys([]);
      },
      onSuccess: (result) => {
        loadedLocationKeyRef.current = result.locationKey;
        setCurrentParent(result.parent);
        setRows(result.rows);
        setTotalCount(result.totalCount);
        updateExpandedRowKeys(result.expandedRowKeys);
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
      onSuccess: (nextRows) => setRows(nextRows as DriveRow[]),
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
  const pathNodes = pathResult?.locationKey === locationKey ? pathResult.nodes : [];

  const enterFolder = (nodeId: string) => {
    startTransition(() => setCurrentLocation({ navigationKey, nodeId }));
  };

  const updateExpandedRow = async (expanded: boolean, record: DriveRow) => {
    if (!expanded || !isContainer(record)) {
      updateExpandedRowKeys((keys) => keys.filter((key) => key !== record.id));
      return;
    }
    if (!childrenMap.has(record.id)) await loadChildren(record);
    updateExpandedRowKeys((keys) => (keys.includes(record.id) ? keys : [...keys, record.id]));
  };

  const dataSource = rows.map((row) => attachChildren(row, childrenMap));
  const handleExpandedChange = async (keys: string[]) => {
    const addedKey = keys.find((key) => !expandedRowKeys.includes(key));
    if (addedKey) {
      const row = findTreeNodeById(dataSource, addedKey);
      if (row) await updateExpandedRow(true, row);
      return;
    }
    const removedKey = expandedRowKeys.find((key) => !keys.includes(key));
    if (!removedKey) return;
    const row = findTreeNodeById(dataSource, removedKey);
    if (row) await updateExpandedRow(false, row);
  };

  const currentPageState = currentParent ? pageStateMap.get(currentParent.id) : undefined;
  return {
    currentNodeId,
    dataSource,
    totalCount,
    pathNodes,
    loading: !ready || loading,
    loadingMore,
    hasMore: Boolean(currentPageState?.cursor),
    loadMore,
    loadMoreChildren: async (nodeId) => {
      const node = findTreeNodeById(dataSource, nodeId);
      if (node && isContainer(node)) await loadMorePagedChildren(node);
    },
    expandedRowKeys,
    enterFolder,
    handleExpandedChange,
    refresh,
  };
}

function attachChildren(row: DriveRow, map: Map<string, DriveViewNode[]>): DriveRow {
  if (!isContainer(row)) return row;
  const cached = map.get(row.id) as DriveRow[] | undefined;
  if (!cached) return row;
  return { ...row, children: cached.map((child) => attachChildren(child, map)) };
}
