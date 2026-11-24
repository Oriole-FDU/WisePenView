import type { DriveContainerNode, DriveNode, DriveNodeScope } from '@/domains/Drive';
import {
  buildDriveNodeKey,
  DRIVE_TREE_MODE,
  DRIVE_TREE_SURFACE,
  type DriveTreeRuntime,
  type DriveTreeSnapshot,
  useDriveTree,
} from '@/runtime/drive';
import { notifyError } from '@/utils/error';

import type { DriveRow, DriveViewNode } from '../common/driveComponentModel';

const DRIVE_BROWSER_RESOURCE_PAGE_SIZE = 50;

interface UseDriveNavigationParams {
  initialNodeId?: string;
  scope: DriveNodeScope;
  ready?: boolean;
  onPathError?: (error: unknown) => void;
}

interface UseDriveNavigationResult {
  runtime: DriveTreeRuntime;
  snapshot: DriveTreeSnapshot;
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
  enterFolder: (nodeId: string) => Promise<void>;
  handleExpandedChange: (keys: string[]) => Promise<void>;
  refresh: () => Promise<void>;
}

const isContainer = (node: DriveViewNode): node is DriveContainerNode =>
  node.type === 'root' || node.type === 'folder';

export function useDriveNavigation({
  initialNodeId,
  scope,
  ready = true,
  onPathError,
}: UseDriveNavigationParams): UseDriveNavigationResult {
  const handleRuntimeError = (error: unknown, runtime: DriveTreeRuntime) => {
    if (onPathError) {
      onPathError(error);
      return;
    }
    notifyError(error);
    if (runtime.getSnapshot().currentNode?.id !== scope.rootId) {
      void runtime.focus(scope.rootId);
    }
  };
  const { runtime, snapshot } = useDriveTree(
    {
      scope,
      surface: DRIVE_TREE_SURFACE.browser,
      mode: DRIVE_TREE_MODE.browse,
      load: { pageSize: DRIVE_BROWSER_RESOURCE_PAGE_SIZE },
    },
    {
      initialNodeId,
      ready,
      onError: handleRuntimeError,
    }
  );
  const currentNodeKey = snapshot.currentNodeKey ?? snapshot.primaryRootKey;
  const dataSource = (snapshot.childrenByKey.get(currentNodeKey) ?? []).map((row) =>
    attachChildren(row as DriveRow, snapshot.childrenByKey)
  );
  const currentPage = snapshot.pageByKey.get(currentNodeKey);
  const expandedRowKeys = [...snapshot.expandedKeys]
    .filter((nodeKey) => snapshot.childrenByKey.has(nodeKey) || snapshot.nodeByKey.has(nodeKey))
    .map((nodeKey) => snapshot.nodeByKey.get(nodeKey))
    .filter((node): node is DriveNode => node?.scope.rootId === scope.rootId)
    .map((node) => node.id);

  const updateExpandedRow = async (expanded: boolean, record: DriveRow) => {
    const nodeKey = buildDriveNodeKey(scope, record.id);
    if (!expanded || !isContainer(record)) {
      runtime.collapseNode(nodeKey);
      return;
    }
    await runtime.expandNode(nodeKey);
  };

  const handleExpandedChange = async (keys: string[]) => {
    const expandedNodeIds = new Set(expandedRowKeys);
    const addedKey = keys.find((key) => !expandedNodeIds.has(key));
    if (addedKey) {
      const row = findDriveRow(dataSource, addedKey);
      if (row) await updateExpandedRow(true, row);
      return;
    }
    const removedKey = expandedRowKeys.find((key) => !keys.includes(key));
    if (!removedKey) return;
    const row = findDriveRow(dataSource, removedKey);
    if (row) await updateExpandedRow(false, row);
  };

  return {
    runtime,
    snapshot,
    currentNodeId: snapshot.currentNode?.id ?? scope.rootId,
    dataSource,
    totalCount: currentPage?.total ?? dataSource.length,
    pathNodes: snapshot.pathNodeKeys
      .map((nodeKey) => snapshot.nodeByKey.get(nodeKey))
      .filter((node): node is DriveNode => Boolean(node)),
    loading: !ready || snapshot.loading || !snapshot.initialized || !snapshot.currentNode,
    loadingMore: snapshot.loadingMoreKeys.has(currentNodeKey),
    hasMore: Boolean(currentPage?.hasMore),
    loadMore: () => {
      void runtime.loadMore(currentNodeKey);
    },
    loadMoreChildren: (nodeId) => runtime.loadMore(buildDriveNodeKey(scope, nodeId)),
    expandedRowKeys,
    enterFolder: (nodeId) => runtime.focus(nodeId),
    handleExpandedChange,
    refresh: () => runtime.refresh(),
  };
}

function attachChildren(
  row: DriveRow,
  childrenByKey: DriveTreeSnapshot['childrenByKey']
): DriveRow {
  if (!isContainer(row)) return row;
  const cached = childrenByKey.get(buildDriveNodeKey(row.scope, row.id));
  if (!cached) return row;
  return { ...row, children: cached.map((child) => attachChildren(child, childrenByKey)) };
}

function findDriveRow(rows: readonly DriveRow[], nodeId: string): DriveRow | undefined {
  for (const row of rows) {
    if (row.id === nodeId) return row;
    const child = row.children ? findDriveRow(row.children, nodeId) : undefined;
    if (child) return child;
  }
  return undefined;
}
