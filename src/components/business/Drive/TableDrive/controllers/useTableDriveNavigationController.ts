import type { DriveContainerNode, DriveNode, DriveNodeScope } from '@/domains/Drive';
import {
  DRIVE_TREE_MODE,
  DRIVE_TREE_SURFACE,
  type DriveTreeRuntime,
  type DriveTreeSnapshot,
  useDriveTree,
} from '@/runtime/drive';
import { notifyError } from '@/utils/error';

import type { DriveViewNode } from '../../common/driveComponentModel';
import type { DriveRow } from '../index.type';

const DRIVE_BROWSER_RESOURCE_PAGE_SIZE = 50;

interface UseTableDriveNavigationControllerParams {
  initialNodeId?: string;
  scope: DriveNodeScope;
  ready?: boolean;
  onPathError?: (error: unknown) => void;
}

interface UseTableDriveNavigationControllerReturn {
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

export function useTableDriveNavigationController({
  initialNodeId,
  scope,
  ready = true,
  onPathError,
}: UseTableDriveNavigationControllerParams): UseTableDriveNavigationControllerReturn {
  const handleRuntimeError = (error: unknown, runtime: DriveTreeRuntime) => {
    if (onPathError) {
      onPathError(error);
      return;
    }
    notifyError(error);
    if (runtime.getSnapshot().currentNodeId !== scope.rootId) {
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
  const dataSource = (snapshot.childrenByParent.get(snapshot.currentNodeId) ?? []).map((row) =>
    attachChildren(row as DriveRow, snapshot.childrenByParent)
  );
  const currentPage = snapshot.pageByParent.get(snapshot.currentNodeId);
  const expandedRowKeys = [...snapshot.expandedNodeIds].filter(
    (nodeId) => snapshot.childrenByParent.has(nodeId) || snapshot.nodeById.has(nodeId)
  );

  const updateExpandedRow = async (expanded: boolean, record: DriveRow) => {
    if (!expanded || !isContainer(record)) {
      runtime.collapseNode(record.id);
      return;
    }
    await runtime.expandNode(record.id);
  };

  const handleExpandedChange = async (keys: string[]) => {
    const addedKey = keys.find((key) => !snapshot.expandedNodeIds.has(key));
    if (addedKey) {
      const row = findDriveRow(dataSource, addedKey);
      if (row) await updateExpandedRow(true, row);
      return;
    }
    const removedKey = [...snapshot.expandedNodeIds].find((key) => !keys.includes(key));
    if (!removedKey) return;
    const row = findDriveRow(dataSource, removedKey);
    if (row) await updateExpandedRow(false, row);
  };

  return {
    runtime,
    snapshot,
    currentNodeId: snapshot.currentNodeId,
    dataSource,
    totalCount: currentPage?.total ?? dataSource.length,
    pathNodes: [...snapshot.pathNodes],
    loading: !ready || snapshot.loading || !snapshot.initialized,
    loadingMore: snapshot.loadingMoreNodeIds.has(snapshot.currentNodeId),
    hasMore: Boolean(currentPage?.hasMore),
    loadMore: () => {
      void runtime.loadMore(snapshot.currentNodeId);
    },
    loadMoreChildren: (nodeId) => runtime.loadMore(nodeId),
    expandedRowKeys,
    enterFolder: (nodeId) => runtime.focus(nodeId),
    handleExpandedChange,
    refresh: runtime.refresh,
  };
}

function attachChildren(
  row: DriveRow,
  childrenByParent: DriveTreeSnapshot['childrenByParent']
): DriveRow {
  if (!isContainer(row)) return row;
  const cached = childrenByParent.get(row.id);
  if (!cached) return row;
  return { ...row, children: cached.map((child) => attachChildren(child, childrenByParent)) };
}

function findDriveRow(rows: readonly DriveRow[], nodeId: string): DriveRow | undefined {
  for (const row of rows) {
    if (row.id === nodeId) return row;
    const child = row.children ? findDriveRow(row.children, nodeId) : undefined;
    if (child) return child;
  }
  return undefined;
}
