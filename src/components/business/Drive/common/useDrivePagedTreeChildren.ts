import { toast } from '@heroui/react';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { DriveContainerNode, DriveNode } from '@/domains/Drive';
import { parseErrorMessage } from '@/utils/error';

import { buildDriveLoadingNode, type DriveViewNode } from './driveComponentModel';

interface DrivePagedTreePageResult {
  nodes: DriveNode[];
  total: number;
  nextCursor?: string;
}

interface DrivePagedTreePageParams {
  parent: DriveContainerNode;
  cursor?: string;
  pageSize?: number;
  refresh?: boolean;
}

interface DrivePagedTreePageState {
  cursor?: string;
  total: number;
  hasMore: boolean;
}

interface UseDrivePagedTreeChildrenParams {
  pageSize?: number;
  loadPage: (params: DrivePagedTreePageParams) => Promise<DrivePagedTreePageResult>;
  countLoaded?: (children: DriveViewNode[]) => number;
  buildLoadingPlaceholder?: (parent: DriveContainerNode, label: string) => DriveViewNode;
}

interface UseDrivePagedTreeChildrenReturn {
  childrenMap: Map<string, DriveViewNode[]>;
  pageStateMap: Map<string, DrivePagedTreePageState>;
  getPageState: (nodeId: string) => DrivePagedTreePageState | undefined;
  loadChildren: (
    parent: DriveContainerNode,
    options?: { refresh?: boolean }
  ) => Promise<DriveViewNode[]>;
  loadMoreChildren: (parent: DriveContainerNode) => Promise<DriveViewNode[]>;
  reset: () => void;
}

const DEFAULT_COUNT_LOADED = (children: DriveViewNode[]): number =>
  children.filter((node) => node.type !== 'loading').length;

export function useDrivePagedTreeChildren({
  pageSize,
  loadPage,
  countLoaded = DEFAULT_COUNT_LOADED,
  buildLoadingPlaceholder = (parent, label) =>
    buildDriveLoadingNode(parent.id, parent.scope, label),
}: UseDrivePagedTreeChildrenParams): UseDrivePagedTreeChildrenReturn {
  const { t } = useTranslation('drive');
  const [childrenMap, setChildrenMap] = useState<Map<string, DriveViewNode[]>>(new Map());
  const [pageStateMap, setPageStateMap] = useState<Map<string, DrivePagedTreePageState>>(new Map());
  const pageStateMapRef = useRef<Map<string, DrivePagedTreePageState>>(new Map());
  const loadingMoreNodeIdsRef = useRef<Set<string>>(new Set());

  const appendLoadMoreNode = (
    parent: DriveContainerNode,
    children: DriveViewNode[],
    pageState: DrivePagedTreePageState
  ): DriveViewNode[] => {
    if (!pageState.hasMore) return children;
    return [
      ...children,
      buildLoadingPlaceholder(
        parent,
        t('node.loadMoreProgress', {
          loaded: countLoaded(children),
          total: pageState.total,
        })
      ),
    ];
  };

  const setNodeChildren = (nodeId: string, children: DriveViewNode[]) => {
    setChildrenMap((prev) => new Map(prev).set(nodeId, children));
  };

  const setNodePageState = (nodeId: string, pageState: DrivePagedTreePageState) => {
    pageStateMapRef.current = new Map(pageStateMapRef.current).set(nodeId, pageState);
    setPageStateMap((prev) => new Map(prev).set(nodeId, pageState));
  };

  const loadChildren = async (
    parent: DriveContainerNode,
    options?: { refresh?: boolean }
  ): Promise<DriveViewNode[]> => {
    setNodeChildren(parent.id, [buildLoadingPlaceholder(parent, t('node.loading'))]);
    try {
      const result = await loadPage({
        parent,
        pageSize,
        refresh: options?.refresh,
      });
      const pageState = {
        cursor: result.nextCursor,
        total: result.total,
        hasMore: Boolean(result.nextCursor),
      };
      setNodePageState(parent.id, pageState);
      const children = appendLoadMoreNode(parent, result.nodes, pageState);
      setNodeChildren(parent.id, children);
      return children;
    } catch (err) {
      toast.danger(parseErrorMessage(err));
      setNodeChildren(parent.id, []);
      return [];
    }
  };

  const loadMoreChildren = async (parent: DriveContainerNode): Promise<DriveViewNode[]> => {
    const pageState = pageStateMapRef.current.get(parent.id);
    const currentChildren = childrenMap.get(parent.id) ?? [];
    if (!pageState?.cursor || loadingMoreNodeIdsRef.current.has(parent.id)) return currentChildren;

    loadingMoreNodeIdsRef.current.add(parent.id);
    const stableChildren = currentChildren.filter((node) => node.type !== 'loading');
    setNodeChildren(parent.id, [
      ...stableChildren,
      buildLoadingPlaceholder(parent, t('node.loading')),
    ]);
    try {
      const result = await loadPage({
        parent,
        cursor: pageState.cursor,
        pageSize,
      });
      const nextPageState = {
        cursor: result.nextCursor,
        total: result.total,
        hasMore: Boolean(result.nextCursor),
      };
      setNodePageState(parent.id, nextPageState);
      const nextChildren = appendLoadMoreNode(
        parent,
        [...stableChildren, ...result.nodes],
        nextPageState
      );
      setNodeChildren(parent.id, nextChildren);
      return nextChildren;
    } catch (err) {
      toast.danger(parseErrorMessage(err));
      setNodeChildren(parent.id, currentChildren);
      return currentChildren;
    } finally {
      loadingMoreNodeIdsRef.current.delete(parent.id);
    }
  };

  const reset = () => {
    setChildrenMap(new Map());
    setPageStateMap(new Map());
    pageStateMapRef.current.clear();
    loadingMoreNodeIdsRef.current.clear();
  };

  return {
    childrenMap,
    pageStateMap,
    getPageState: (nodeId) => pageStateMapRef.current.get(nodeId),
    loadChildren,
    loadMoreChildren,
    reset,
  };
}
