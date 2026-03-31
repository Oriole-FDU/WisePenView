import { useState, useCallback, useMemo } from 'react';
import { useRequest } from 'ahooks';
import { getTreeDriveCwdStore } from '@/store';
import { parseErrorMessage } from '@/utils/parseErrorMessage';
import { useAppMessage } from '@/hooks/useAppMessage';
import type { TreeRowItem, LoadMoreRowItem } from '@/components/Drive/TreeDrive/index.type';
import {
  buildCurrentNodeView,
  buildNodeChildRows,
  updateNodeChildren,
  replaceLoadMoreInNode,
  replaceTopLevelLoadMore,
} from './treeRowDataUtil';
import type { TreeDriveNode, UseTreeDriveParams, UseTreeDriveReturn } from './useTreeDrive.type';

const FILE_PAGE_SIZE = 100;

// 用视图类型和groupId标定唯一的cwd store key
function resolveTreeDriveCwdStoreKey(cwdStoreKey: string, groupId?: string): string {
  const scope = groupId?.trim() ? groupId.trim() : 'user';
  return `${cwdStoreKey}:${scope}`;
}

export function useTreeDrive({
  adapter,
  groupId,
  cwdStoreKey = 'default',
}: UseTreeDriveParams): UseTreeDriveReturn {
  const message = useAppMessage();
  const persistedCwdKey = useMemo(
    () => resolveTreeDriveCwdStoreKey(cwdStoreKey, groupId),
    [cwdStoreKey, groupId]
  );
  const useCwdStore = useMemo(() => getTreeDriveCwdStore(persistedCwdKey), [persistedCwdKey]);

  const [treeData, setTreeData] = useState<TreeRowItem[]>([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [expandedKeys, setExpandedKeys] = useState<string[]>([]);
  const [loadingMoreKeys, setLoadingMoreKeys] = useState<Set<string>>(new Set());

  const breadcrumb = useCwdStore((s) => s.breadcrumb);
  const pushNode = useCwdStore((s) => s.pushNode);
  const navigateToIndex = useCwdStore((s) => s.navigateToIndex);
  const resetCwd = useCwdStore((s) => s.reset);

  const currentTagId = breadcrumb.length > 0 ? breadcrumb[breadcrumb.length - 1].tagId : null;

  const { loading } = useRequest(
    async (): Promise<TreeRowItem[] | null> => {
      const root = await adapter.loadTree(groupId);

      let currentNode: TreeDriveNode;
      if (currentTagId) {
        const found = adapter.getNodeById(currentTagId, groupId);
        if (!found) {
          resetCwd();
          return null;
        }
        currentNode = found;
      } else {
        currentNode = root;
      }

      const res = await adapter.getNodeContents({
        node: currentNode,
        filePage: 1,
        filePageSize: FILE_PAGE_SIZE,
      });

      return buildCurrentNodeView(
        res.childNodes,
        res.files,
        currentNode,
        res.totalFiles,
        FILE_PAGE_SIZE
      );
    },
    {
      refreshDeps: [adapter, groupId, currentTagId, refreshTrigger],
      onSuccess: (rows) => {
        if (rows == null) return;
        setTreeData(rows);
        setExpandedKeys([]);
      },
      onError: (err) => {
        message.error(parseErrorMessage(err, '加载内容失败'));
        setTreeData([]);
      },
    }
  );

  const refresh = useCallback(() => setRefreshTrigger((c) => c + 1), []);

  const handleExpandChange = useCallback(
    async (expanded: boolean, record: TreeRowItem) => {
      const key = record.key;

      if (!expanded) {
        setExpandedKeys((prev) => prev.filter((k) => k !== key));
        return;
      }

      if (record._type !== 'folder') return;

      try {
        const res = await adapter.getNodeContents({
          node: record.data,
          filePage: 1,
          filePageSize: FILE_PAGE_SIZE,
        });
        const children = buildNodeChildRows(res.childNodes, res.files, {
          parentKey: key,
          treeNode: record.data,
          totalLeaves: res.totalFiles,
          leafPageSize: FILE_PAGE_SIZE,
        });
        setTreeData((prev) => updateNodeChildren(prev, key, children));
        setExpandedKeys((prev) => (prev.includes(key) ? prev : [...prev, key]));
      } catch (err) {
        message.error(parseErrorMessage(err, '加载内容失败'));
      }
    },
    [adapter, message]
  );

  const handleTreeNodeClick = useCallback(
    (node: TreeDriveNode) => {
      pushNode({ tagId: node.tagId, tagName: node.tagName });
    },
    [pushNode]
  );

  const handleLoadMore = useCallback(
    async (record: LoadMoreRowItem) => {
      if (loadingMoreKeys.has(record.key)) return;
      setLoadingMoreKeys((prev) => new Set(prev).add(record.key));
      try {
        const res = await adapter.getNodeContents({
          node: record.treeNode,
          filePage: record.nextPage,
          filePageSize: FILE_PAGE_SIZE,
        });
        const isTopLevel = treeData.some((row) => row.key === record.key);
        setTreeData((prev) =>
          isTopLevel
            ? replaceTopLevelLoadMore(prev, record, res.files, res.totalFiles)
            : replaceLoadMoreInNode(prev, record, res.files, res.totalFiles)
        );
      } catch (err) {
        message.error(parseErrorMessage(err, '加载更多文件失败'));
      } finally {
        setLoadingMoreKeys((prev) => {
          const next = new Set(prev);
          next.delete(record.key);
          return next;
        });
      }
    },
    [adapter, message, loadingMoreKeys, treeData]
  );

  return {
    treeData,
    loading,
    expandedKeys,
    breadcrumb,
    loadingMoreKeys,
    refresh,
    handleExpandChange,
    handleTreeNodeClick,
    handleLoadMore,
    resetCwd,
    navigateToIndex,
  };
}
