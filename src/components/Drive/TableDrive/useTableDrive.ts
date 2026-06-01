import { useDriveService } from '@/domains';
import type { DriveNode, LoadMoreNode } from '@/domains/Drive';
import { parseErrorMessage } from '@/utils/error';
import { toast } from '@heroui/react';
import { useRequest } from 'ahooks';
import { useCallback, useMemo, useState } from 'react';
import { useDriveTreeChildren } from '../common/useDriveTreeChildren';
import type { DriveRow } from './index.type';

interface UseTableDriveParams {
  rootId: string;
  groupId?: string;
}

interface UseTableDriveReturn {
  currentNodeId: string;
  /** 当前层级的 dataSource（已挂上 expanded children） */
  dataSource: DriveRow[];
  /** breadcrumb 路径（含目标节点本身） */
  pathNodes: DriveNode[];
  loading: boolean;
  loadingMoreParentId: string | null;
  expandedRowKeys: string[];
  /** 进入子目录（仅 folder 调用） */
  enterFolder: (nodeId: string) => void;
  /** 点击 LoadMoreNode 行：再加载一页 */
  handleLoadMore: (node: LoadMoreNode) => Promise<void>;
  /** Table 的 onExpand 回调 */
  handleExpand: (expanded: boolean, record: DriveRow) => Promise<void>;
  /** 重新拉取当前层级 children（drop / 重命名 / 删除 等操作后调用） */
  refresh: () => void;
}

/**
 * TableDrive 核心 hook：
 * - 维护 currentNodeId / rows / expandedRowKeys / expandedChildrenMap
 * - 通过 driveService 派生 children + breadcrumb，分页状态机收敛在 service 内部
 */
export function useTableDrive({ rootId, groupId }: UseTableDriveParams): UseTableDriveReturn {
  const driveService = useDriveService();
  const { childrenMap, loadChildren, loadMore, reset } = useDriveTreeChildren({ groupId });

  const [currentNodeId, setCurrentNodeId] = useState<string>(rootId);
  const [rows, setRows] = useState<DriveRow[]>([]);
  const [expandedRowKeys, setExpandedRowKeys] = useState<string[]>([]);
  const [loadingMoreParentId, setLoadingMoreParentId] = useState<string | null>(null);

  // 切换 currentNodeId / groupId：拉取当前层级 children
  const { loading, refresh } = useRequest(
    async () => {
      reset();
      return loadChildren(currentNodeId);
    },
    {
      refreshDeps: [currentNodeId, groupId],
      onBefore: () => {
        setExpandedRowKeys([]);
      },
      onSuccess: (children) => {
        setRows(children as DriveRow[]);
      },
    }
  );

  // 派生 breadcrumb 路径
  const { data: pathNodes = [] } = useRequest(
    () => driveService.getPathById({ nodeId: currentNodeId, groupId }),
    {
      refreshDeps: [currentNodeId, groupId],
      onError: (err) => {
        toast.danger(parseErrorMessage(err));
        if (currentNodeId !== rootId) setCurrentNodeId(rootId);
      },
    }
  );

  const enterFolder = useCallback((nodeId: string) => {
    setCurrentNodeId(nodeId);
  }, []);

  const handleLoadMore = useCallback(
    async (node: LoadMoreNode) => {
      // 加载期间忽略重复点击
      if (loadingMoreParentId === node.parentId) return;
      setLoadingMoreParentId(node.parentId);
      try {
        const next = await loadMore(node);
        if (node.parentId === currentNodeId) {
          setRows(next as DriveRow[]);
        }
      } finally {
        setLoadingMoreParentId(null);
      }
    },
    [loadMore, currentNodeId, loadingMoreParentId]
  );

  const handleExpand = useCallback(
    async (expanded: boolean, record: DriveRow) => {
      if (!expanded || record.type !== 'folder') {
        setExpandedRowKeys((keys) => keys.filter((k) => k !== record.id));
        return;
      }
      if (!childrenMap.has(record.id)) {
        await loadChildren(record.id);
      }
      setExpandedRowKeys((keys) => (keys.includes(record.id) ? keys : [...keys, record.id]));
    },
    [childrenMap, loadChildren]
  );

  // 浅 map：folder 命中 expandedChildrenMap 时挂 children，否则原样返回
  const dataSource = useMemo<DriveRow[]>(() => {
    return rows.map((row) => attachChildren(row, childrenMap));
  }, [rows, childrenMap]);

  return {
    currentNodeId,
    dataSource,
    pathNodes,
    loading,
    loadingMoreParentId,
    expandedRowKeys,
    enterFolder,
    handleLoadMore,
    handleExpand,
    refresh,
  };
}

function attachChildren(row: DriveRow, map: Map<string, DriveNode[]>): DriveRow {
  if (row.type !== 'folder') return row;
  const cached = map.get(row.id) as DriveRow[] | undefined;
  if (!cached) return row;
  return { ...row, children: cached.map((c) => attachChildren(c, map)) };
}
