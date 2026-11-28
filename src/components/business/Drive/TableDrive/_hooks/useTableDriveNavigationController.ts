import { useRef, useState } from 'react';

import type { DriveContainerNode, DriveNode, DriveNodeScope } from '@/domains/Drive';
import { findTreeNodeById } from '@/utils/tree/findTreeNodeById';

import type { DriveViewNode } from '../../_common/driveComponentModel';
import { useDriveBrowserController } from '../../_common/useDriveBrowserController';
import type { DriveRow } from '../index.type';

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

const isContainer = (node: DriveViewNode): node is DriveContainerNode =>
  node.type === 'root' || node.type === 'folder';

export function useTableDriveNavigationController({
  initialNodeId,
  scope,
  ready = true,
  onPathError,
}: UseTableDriveNavigationControllerParams): UseTableDriveNavigationControllerReturn {
  const expandedRowKeysRef = useRef<string[]>([]);
  const loadedLocationKeyRef = useRef<string | undefined>(undefined);
  const [expandedState, setExpandedState] = useState<{ locationKey: string; keys: string[] }>({
    locationKey: '',
    keys: [],
  });
  const browser = useDriveBrowserController({
    initialNodeId,
    scope,
    ready,
    onPathError,
    getExpandedNodeIdsToRestore: (nextLocationKey) =>
      loadedLocationKeyRef.current === nextLocationKey ? new Set(expandedRowKeysRef.current) : null,
    onExpandedNodeIdsRestored: (nextLocationKey, nodeIds) => {
      loadedLocationKeyRef.current = nextLocationKey;
      expandedRowKeysRef.current = nodeIds;
      setExpandedState({ locationKey: nextLocationKey, keys: nodeIds });
    },
  });
  const locationKey = `${scope.rootId}\u0000${initialNodeId ?? ''}\u0000${browser.currentNodeId}`;
  const expandedRowKeys = expandedState.locationKey === locationKey ? expandedState.keys : [];

  const updateExpandedRowKeys = (updater: string[] | ((keys: string[]) => string[])) => {
    const baseKeys = expandedState.locationKey === locationKey ? expandedRowKeysRef.current : [];
    const nextKeys = typeof updater === 'function' ? updater(baseKeys) : updater;
    expandedRowKeysRef.current = nextKeys;
    setExpandedState({ locationKey, keys: nextKeys });
  };

  const updateExpandedRow = async (expanded: boolean, record: DriveRow) => {
    if (!expanded || !isContainer(record)) {
      updateExpandedRowKeys((keys) => keys.filter((key) => key !== record.id));
      return;
    }
    if (!browser.childrenMap.has(record.id)) await browser.loadChildren(record);
    updateExpandedRowKeys((keys) => (keys.includes(record.id) ? keys : [...keys, record.id]));
  };

  const dataSource = browser.rows.map((row) =>
    attachChildren(row as DriveRow, browser.childrenMap)
  );
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

  return {
    currentNodeId: browser.currentNodeId,
    dataSource,
    totalCount: browser.totalCount,
    pathNodes: browser.pathNodes,
    loading: browser.loading,
    loadingMore: browser.loadingMore,
    hasMore: browser.hasMore,
    loadMore: browser.loadMore,
    loadMoreChildren: async (nodeId) => {
      const node = findTreeNodeById(dataSource, nodeId);
      if (node && isContainer(node)) await browser.loadMoreChildren(node);
    },
    expandedRowKeys,
    enterFolder: browser.enterFolder,
    handleExpandedChange,
    refresh: browser.refresh,
  };
}

function attachChildren(row: DriveRow, map: Map<string, DriveViewNode[]>): DriveRow {
  if (!isContainer(row)) return row;
  const cached = map.get(row.id) as DriveRow[] | undefined;
  if (!cached) return row;
  return { ...row, children: cached.map((child) => attachChildren(child, map)) };
}
