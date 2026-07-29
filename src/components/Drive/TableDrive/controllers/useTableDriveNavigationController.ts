import { useDriveService } from '@/domains';
import type { DriveNode, DriveNodeScope } from '@/domains/Drive';
import { parseErrorMessage } from '@/utils/error';
import { findTreeNodeById } from '@/utils/tree/findTreeNodeById';
import { toast } from '@heroui/react';
import { useRequest } from 'ahooks';
import { startTransition, useRef, useState } from 'react';
import { useDriveTreeChildren } from '../../common/useDriveTreeChildren';
import type { DriveRow } from '../index.type';

interface UseTableDriveNavigationControllerParams {
  initialNodeId?: string;
  scope: DriveNodeScope;
}

interface UseTableDriveNavigationControllerReturn {
  currentNodeId: string;
  /** 当前层级的 dataSource（已挂上 expanded children） */
  dataSource: DriveRow[];
  /** breadcrumb 路径（含目标节点本身） */
  pathNodes: DriveNode[];
  loading: boolean;
  expandedRowKeys: string[];
  /** 进入容器目录（root / folder 调用） */
  enterFolder: (nodeId: string) => void;
  /** Table 展开行变更回调 */
  handleExpandedChange: (keys: string[]) => Promise<void>;
  /** 重新拉取当前层级 children（移动 / 重命名 / 删除 等操作后调用） */
  refresh: () => void;
}

interface DrivePathResult {
  locationKey: string;
  nodes: DriveNode[];
}

interface DriveRowsResult {
  locationKey: string;
  rows: DriveRow[];
  expandedRowKeys: string[];
}

/**
 * TableDrive 核心 hook：
 * - 维护 currentNodeId / rows / expandedRowKeys / expandedChildrenMap
 * - 通过 driveService 派生 children + breadcrumb，分页状态机收敛在 service 内部
 */
export function useTableDriveNavigationController({
  initialNodeId,
  scope,
}: UseTableDriveNavigationControllerParams): UseTableDriveNavigationControllerReturn {
  const driveService = useDriveService();

  // 当前 Drive 作用域及其子节点缓存
  const rootId = scope.rootId;
  const groupId = scope.type === 'group' ? scope.groupId : undefined;
  const { childrenMap, loadChildren, reset } = useDriveTreeChildren({ groupId, scope });

  // 导航定位：作用域或初始节点变化时重置当前目录
  const navigationKey = `${rootId}\u0000${initialNodeId ?? ''}`;
  const initialCurrentNodeId = initialNodeId ?? rootId;
  const [currentLocation, setCurrentLocation] = useState({
    navigationKey,
    nodeId: initialCurrentNodeId,
  });
  const currentNodeId =
    currentLocation.navigationKey === navigationKey ? currentLocation.nodeId : initialCurrentNodeId;

  // 当前目录内容及展开状态
  const [rows, setRows] = useState<DriveRow[]>([]);
  const [expandedRowKeys, setExpandedRowKeys] = useState<string[]>([]);

  // 用于异步刷新期间恢复展开分支，并避免闭包读取旧状态
  const expandedRowKeysRef = useRef<string[]>([]);
  const loadedLocationKeyRef = useRef<string | undefined>(undefined);

  // 区分作用域、初始节点和当前目录的请求与缓存状态
  const locationKey = `${navigationKey}\u0000${currentNodeId}`;

  const updateExpandedRowKeys = (updater: string[] | ((currentKeys: string[]) => string[])) => {
    const nextKeys = typeof updater === 'function' ? updater(expandedRowKeysRef.current) : updater;
    expandedRowKeysRef.current = nextKeys;
    setExpandedRowKeys(nextKeys);
  };

  // 切换目录时清空展开状态；同目录刷新时重载已展开分支并保留仍然存在的节点。
  const { loading, refresh } = useRequest(
    async (): Promise<DriveRowsResult> => {
      const expandedKeysToRestore =
        loadedLocationKeyRef.current === locationKey ? new Set(expandedRowKeysRef.current) : null;
      reset();
      const nextRows = await loadChildren(currentNodeId);
      if (!expandedKeysToRestore?.size) {
        return { locationKey, rows: nextRows as DriveRow[], expandedRowKeys: [] };
      }

      const restoredExpandedKeys: string[] = [];
      const reloadExpandedChildren = async (nodes: DriveNode[]): Promise<void> => {
        await Promise.all(
          nodes.map(async (node) => {
            if (
              (node.type !== 'root' && node.type !== 'folder') ||
              !expandedKeysToRestore.has(node.id)
            ) {
              return;
            }
            restoredExpandedKeys.push(node.id);
            const children = await loadChildren(node.id);
            await reloadExpandedChildren(children);
          })
        );
      };
      await reloadExpandedChildren(nextRows);

      return {
        locationKey,
        rows: nextRows as DriveRow[],
        expandedRowKeys: restoredExpandedKeys,
      };
    },
    {
      refreshDeps: [currentNodeId, groupId, rootId],
      onBefore: () => {
        if (loadedLocationKeyRef.current !== locationKey) {
          updateExpandedRowKeys([]);
        }
      },
      onSuccess: (result) => {
        loadedLocationKeyRef.current = result.locationKey;
        setRows(result.rows);
        updateExpandedRowKeys(result.expandedRowKeys);
      },
    }
  );

  // 派生 breadcrumb 路径
  const { data: pathResult } = useRequest(
    async (): Promise<DrivePathResult> => ({
      locationKey,
      nodes: await driveService.getNodePath({ nodeId: currentNodeId, groupId }),
    }),
    {
      refreshDeps: [currentNodeId, groupId],
      onError: (err) => {
        toast.danger(parseErrorMessage(err));
        if (currentNodeId !== rootId) {
          setCurrentLocation({ navigationKey, nodeId: rootId });
        }
      },
    }
  );
  const pathNodes = pathResult?.locationKey === locationKey ? pathResult.nodes : [];

  // 切换目录
  const enterFolder = (nodeId: string) => {
    startTransition(() => {
      setCurrentLocation({ navigationKey, nodeId });
    });
  };

  // 展开 / 收起目录
  const updateExpandedRow = async (expanded: boolean, record: DriveRow) => {
    if (!expanded || (record.type !== 'root' && record.type !== 'folder')) {
      updateExpandedRowKeys((keys) => keys.filter((k) => k !== record.id));
      return;
    }
    if (!childrenMap.has(record.id)) {
      await loadChildren(record.id);
    }
    updateExpandedRowKeys((keys) => (keys.includes(record.id) ? keys : [...keys, record.id]));
  };

  // 浅 map：folder 命中 expandedChildrenMap 时挂 children，否则原样返回
  const dataSource = (() => {
    return rows.map((row) => attachChildren(row, childrenMap));
  })() satisfies DriveRow[];

  // Table 展开行变更回调
  const handleExpandedChange = async (keys: string[]) => {
    const addedKey = keys.find((key) => !expandedRowKeys.includes(key));
    if (addedKey) {
      const row = findTreeNodeById(dataSource, addedKey);
      if (row) {
        await updateExpandedRow(true, row);
        return;
      }
    }

    const removedKey = expandedRowKeys.find((key) => !keys.includes(key));
    if (!removedKey) return;

    const row = findTreeNodeById(dataSource, removedKey);
    if (row) {
      await updateExpandedRow(false, row);
    }
  };

  return {
    currentNodeId,
    dataSource,
    pathNodes,
    loading,
    expandedRowKeys,
    enterFolder,
    handleExpandedChange,
    refresh,
  };
}

function attachChildren(row: DriveRow, map: Map<string, DriveNode[]>): DriveRow {
  if (row.type !== 'root' && row.type !== 'folder') return row;
  const cached = map.get(row.id) as DriveRow[] | undefined;
  if (!cached) return row;
  return { ...row, children: cached.map((c) => attachChildren(c, map)) };
}
