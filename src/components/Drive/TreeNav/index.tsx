import React, { useCallback, useMemo, useRef, useState } from 'react';
import { Tree, Spin, Empty } from 'antd';
import type { DataNode } from 'antd/es/tree';
import { LuChevronDown } from 'react-icons/lu';
import { useRequest } from 'ahooks';
import { useFolderService, useTagService } from '@/contexts/ServicesContext';
import type { TagTreeNode } from '@/services/Tag/index.type';
import { mapFolderToTagTreeNode } from '@/types/folder';
import { parseErrorMessage } from '@/utils/parseErrorMessage';
import { useAppMessage } from '@/hooks/useAppMessage';
import type { ITreeDriveAdapter } from '@/hooks/drive/useTreeDrive.type';
import type { TreeNavProps, NodeMap } from './index.type';
import { ROOT_DISPLAY, createFolderDataNode, replaceNodeChildren } from './folderUtil';
import { tagToDataNode } from './tagUtil';
import type { ResourceItem } from '@/types/resource';
import {
  TREE_NAV_FILE_KEY_PREFIX,
  TREE_NAV_FILE_PAGE_SIZE,
  type NavLoadMoreMeta,
  type NavNodeBuildContext,
  buildFolderNavChildren,
  buildNavChildrenFromContents,
  replaceLoadMoreInNavTree,
  tagToLazyNavDataNode,
} from './treeNavDataUtil';
import styles from './style.module.less';

const LOAD_MORE_KEY_PREFIX = 'loadMore-';

function isLoadMoreTreeKey(key: React.Key): boolean {
  return String(key).startsWith(LOAD_MORE_KEY_PREFIX);
}

const TreeNav: React.FC<TreeNavProps> = ({
  viewMode,
  selectMode,
  groupId,
  onChange,
  refreshTrigger = 0,
  tagInitialCheckedIds,
}) => {
  const folderService = useFolderService();
  const tagService = useTagService();
  const message = useAppMessage();

  const showFiles = !(viewMode === 'tag' && selectMode === 'nodes');

  const adapter = useMemo<ITreeDriveAdapter>(() => {
    if (viewMode === 'folder') {
      return {
        loadTree: async (gid) =>
          mapFolderToTagTreeNode(await folderService.getFolderTree({ groupId: gid })),
        getNodeById: (nodeId, gid) => {
          const f = folderService.getFolderById(nodeId, gid);
          return f ? mapFolderToTagTreeNode(f) : undefined;
        },
        getNodeContents: async ({ node, filePage, filePageSize }) => {
          const res = await folderService.getResByFolder({
            folder: node,
            filePage,
            filePageSize,
          });
          return {
            childNodes: res.folders.map(mapFolderToTagTreeNode),
            files: res.files,
            totalFiles: res.totalFiles,
          };
        },
      };
    }
    return {
      loadTree: async () => {
        throw new Error('TreeNav tag mode does not use adapter.loadTree');
      },
      getNodeById: (nodeId, gid) => tagService.getTagById(nodeId, gid),
      getNodeContents: async ({ node, filePage, filePageSize }) => {
        const res = await tagService.getResByTag({ tag: node, filePage, filePageSize });
        return { childNodes: res.tags, files: res.files, totalFiles: res.totalFiles };
      },
    };
  }, [viewMode, folderService, tagService]);

  const [treeData, setTreeData] = useState<DataNode[]>([]);
  const [selectedKeys, setSelectedKeys] = useState<React.Key[]>([]);
  const [checkedTagKeys, setCheckedTagKeys] = useState<React.Key[]>([]);
  const [checkedFileKeys, setCheckedFileKeys] = useState<React.Key[]>([]);

  const nodeMapRef = useRef<NodeMap>(new Map());
  const loadMoreMetaRef = useRef<Map<string, NavLoadMoreMeta>>(new Map());
  const resourceByIdRef = useRef<Map<string, ResourceItem>>(new Map());
  const onChangeRef = useRef(onChange);
  const handleLoadMoreRef = useRef<(k: string) => Promise<void>>(async () => {});
  const inflightLoadMoreRef = useRef<Set<string>>(new Set());

  onChangeRef.current = onChange;

  const tagInitialCheckKey = useMemo(() => {
    if (tagInitialCheckedIds === undefined) return '';
    return [...tagInitialCheckedIds].sort().join('\u0001');
  }, [tagInitialCheckedIds]);

  const handleLoadMore = useCallback(
    async (loadMoreKey: string) => {
      const meta = loadMoreMetaRef.current.get(loadMoreKey);
      if (!meta || inflightLoadMoreRef.current.has(loadMoreKey)) return;
      inflightLoadMoreRef.current.add(loadMoreKey);
      try {
        const res = await adapter.getNodeContents({
          node: meta.treeNode,
          filePage: meta.nextPage,
          filePageSize: TREE_NAV_FILE_PAGE_SIZE,
        });
        const ctx: NavNodeBuildContext = {
          nodeMap: nodeMapRef.current,
          resourceById: resourceByIdRef.current,
          loadMoreMetaByKey: loadMoreMetaRef.current,
          showFiles,
          selectMode,
          viewMode,
          onLoadMoreClick: (k) => void handleLoadMoreRef.current(k),
        };
        setTreeData((prev) =>
          replaceLoadMoreInNavTree(
            prev,
            loadMoreKey,
            meta.parentKey,
            res.files,
            res.totalFiles,
            meta.loadedFiles,
            meta.nextPage,
            meta.treeNode,
            ctx
          )
        );
      } catch (err) {
        message.error(parseErrorMessage(err, '加载更多文件失败'));
      } finally {
        inflightLoadMoreRef.current.delete(loadMoreKey);
      }
    },
    [adapter, message, showFiles, selectMode, viewMode]
  );

  handleLoadMoreRef.current = handleLoadMore;

  // folder
  const { loading: folderLoading } = useRequest(
    async (): Promise<DataNode[]> => {
      nodeMapRef.current.clear();
      loadMoreMetaRef.current.clear();
      resourceByIdRef.current.clear();

      const ctx: NavNodeBuildContext = {
        nodeMap: nodeMapRef.current,
        resourceById: resourceByIdRef.current,
        loadMoreMetaByKey: loadMoreMetaRef.current,
        showFiles,
        selectMode,
        viewMode,
        onLoadMoreClick: (k) => void handleLoadMoreRef.current(k),
      };

      const root = await folderService.getFolderTree({ groupId });
      const childNodes = await buildFolderNavChildren(root, ctx, folderService);
      const rootNode: DataNode = {
        ...createFolderDataNode(root, nodeMapRef.current, ROOT_DISPLAY),
        checkable: false,
        selectable: selectMode === 'nodes',
        children: childNodes,
      };
      return [rootNode];
    },
    {
      ready: viewMode === 'folder',
      refreshDeps: [viewMode, groupId, refreshTrigger, folderService, showFiles, selectMode],
      onSuccess: (data) => {
        setTreeData(data);
        setSelectedKeys([]);
        setCheckedFileKeys([]);
        onChangeRef.current?.([], []);
      },
      onError: (err) => {
        message.error(parseErrorMessage(err, '获取文件夹树失败'));
        setTreeData([]);
      },
    }
  );

  // tag + nodes（完整树，无文件）
  const { loading: tagNodesLoading } = useRequest(
    async (): Promise<DataNode[]> => {
      nodeMapRef.current.clear();
      loadMoreMetaRef.current.clear();
      resourceByIdRef.current.clear();

      const nodes = await tagService.getTagTree(groupId);
      return nodes
        .map((n) => tagToDataNode(n, nodeMapRef.current))
        .filter((n): n is DataNode => n != null);
    },
    {
      ready: viewMode === 'tag' && selectMode === 'nodes',
      refreshDeps: [
        viewMode,
        selectMode,
        groupId,
        refreshTrigger,
        tagService,
        tagInitialCheckKey,
        tagInitialCheckedIds,
      ],
      onSuccess: (data) => {
        setTreeData(data);
        const initialIds = (tagInitialCheckedIds ?? []).filter((id) => nodeMapRef.current.has(id));
        setCheckedTagKeys(initialIds);
        const selectedNodes = initialIds
          .map((k) => nodeMapRef.current.get(String(k)))
          .filter((n): n is TagTreeNode => n != null);
        onChangeRef.current?.(selectedNodes, []);
      },
      onError: (err) => {
        message.error(parseErrorMessage(err, '获取标签树失败'));
        setTreeData([]);
      },
    }
  );

  // tag + leaves（懒加载子标签与文件）
  const { loading: tagLeavesLoading } = useRequest(
    async (): Promise<DataNode[]> => {
      nodeMapRef.current.clear();
      loadMoreMetaRef.current.clear();
      resourceByIdRef.current.clear();

      const ctx: NavNodeBuildContext = {
        nodeMap: nodeMapRef.current,
        resourceById: resourceByIdRef.current,
        loadMoreMetaByKey: loadMoreMetaRef.current,
        showFiles: true,
        selectMode,
        viewMode,
        onLoadMoreClick: (k) => void handleLoadMoreRef.current(k),
      };

      const nodes = await tagService.getTagTree(groupId);
      return nodes.map((n) => tagToLazyNavDataNode(n, ctx)).filter((n): n is DataNode => n != null);
    },
    {
      ready: viewMode === 'tag' && selectMode === 'leaves',
      refreshDeps: [viewMode, selectMode, groupId, refreshTrigger, tagService],
      onSuccess: (data) => {
        setTreeData(data);
        setCheckedFileKeys([]);
        onChangeRef.current?.([], []);
      },
      onError: (err) => {
        message.error(parseErrorMessage(err, '获取标签树失败'));
        setTreeData([]);
      },
    }
  );

  const loading = folderLoading || tagNodesLoading || tagLeavesLoading;

  const handleLoadFolderData = useCallback(
    async (treeNode: DataNode) => {
      const key = String(treeNode.key);
      if (key.startsWith(TREE_NAV_FILE_KEY_PREFIX) || isLoadMoreTreeKey(key)) return;
      const folder = folderService.getFolderById(key, groupId);
      if (!folder) return;

      const ctx: NavNodeBuildContext = {
        nodeMap: nodeMapRef.current,
        resourceById: resourceByIdRef.current,
        loadMoreMetaByKey: loadMoreMetaRef.current,
        showFiles,
        selectMode,
        viewMode,
        onLoadMoreClick: (k) => void handleLoadMoreRef.current(k),
      };
      try {
        const children = await buildFolderNavChildren(folder, ctx, folderService);
        setTreeData((prev) => replaceNodeChildren(prev, key, children));
      } catch (err) {
        message.error(parseErrorMessage(err, '加载文件夹内容失败'));
      }
    },
    [folderService, groupId, showFiles, selectMode, viewMode, message]
  );

  const handleLoadTagLeavesData = useCallback(
    async (treeNode: DataNode) => {
      const key = String(treeNode.key);
      if (key.startsWith(TREE_NAV_FILE_KEY_PREFIX) || isLoadMoreTreeKey(key)) return;
      const tag = nodeMapRef.current.get(key);
      if (!tag) return;

      const ctx: NavNodeBuildContext = {
        nodeMap: nodeMapRef.current,
        resourceById: resourceByIdRef.current,
        loadMoreMetaByKey: loadMoreMetaRef.current,
        showFiles: true,
        selectMode,
        viewMode,
        onLoadMoreClick: (k) => void handleLoadMoreRef.current(k),
      };

      try {
        const res = await adapter.getNodeContents({
          node: tag,
          filePage: 1,
          filePageSize: TREE_NAV_FILE_PAGE_SIZE,
        });
        const children = buildNavChildrenFromContents(
          res.childNodes,
          res.files,
          res.totalFiles,
          key,
          tag,
          ctx,
          (n) => tagToLazyNavDataNode(n, ctx)
        );
        setTreeData((prev) => replaceNodeChildren(prev, key, children));
      } catch (err) {
        message.error(parseErrorMessage(err, '加载标签内容失败'));
      }
    },
    [adapter, selectMode, viewMode, message]
  );

  const loadDataProp =
    viewMode === 'folder'
      ? handleLoadFolderData
      : viewMode === 'tag' && selectMode === 'leaves'
        ? handleLoadTagLeavesData
        : undefined;

  const handleSelectFolders = useCallback(
    (keys: React.Key[]) => {
      if (selectMode !== 'nodes') return;
      setSelectedKeys(keys);
      if (keys.length === 0) {
        onChangeRef.current?.([], []);
      } else {
        const node = nodeMapRef.current.get(String(keys[0]));
        onChangeRef.current?.(node ? [node] : [], []);
      }
    },
    [selectMode]
  );

  const handleCheckTags = useCallback(
    (checked: React.Key[] | { checked: React.Key[]; halfChecked: React.Key[] }) => {
      if (viewMode !== 'tag' || selectMode !== 'nodes') return;
      const keys = Array.isArray(checked) ? checked : checked.checked;
      setCheckedTagKeys(keys);
      const nodes = keys
        .map((k) => nodeMapRef.current.get(String(k)))
        .filter((n): n is TagTreeNode => n != null);
      onChangeRef.current?.(nodes, []);
    },
    [viewMode, selectMode]
  );

  const handleCheckFiles = useCallback(
    (checked: React.Key[] | { checked: React.Key[]; halfChecked: React.Key[] }) => {
      if (selectMode !== 'leaves') return;
      const keys = Array.isArray(checked) ? checked : checked.checked;
      const fileKeys = keys.filter((k) => String(k).startsWith(TREE_NAV_FILE_KEY_PREFIX));
      setCheckedFileKeys(fileKeys);
      const leaves = fileKeys
        .map((k) => resourceByIdRef.current.get(String(k).slice(TREE_NAV_FILE_KEY_PREFIX.length)))
        .filter((x): x is ResourceItem => x != null);
      onChangeRef.current?.([], leaves);
    },
    [selectMode]
  );

  const treeCheckable = (viewMode === 'tag' && selectMode === 'nodes') || selectMode === 'leaves';

  const treeSelectable = viewMode === 'folder' && selectMode === 'nodes';

  const checkedKeysForTree =
    viewMode === 'tag' && selectMode === 'nodes'
      ? checkedTagKeys
      : selectMode === 'leaves'
        ? checkedFileKeys
        : undefined;

  const onCheckProp =
    viewMode === 'tag' && selectMode === 'nodes'
      ? handleCheckTags
      : selectMode === 'leaves'
        ? handleCheckFiles
        : undefined;

  if (loading && treeData.length === 0) {
    return (
      <div className={styles.wrapper}>
        <Spin />
      </div>
    );
  }

  if (!loading && treeData.length === 0) {
    return (
      <div className={styles.wrapper}>
        <Empty description={viewMode === 'tag' ? '暂无标签' : '暂无内容'} />
      </div>
    );
  }

  return (
    <div className={styles.wrapper}>
      <div className={styles.treeArea}>
        <Tree
          treeData={treeData}
          className={styles.tree}
          blockNode
          checkable={treeCheckable}
          checkStrictly={treeCheckable}
          selectable={treeSelectable}
          selectedKeys={treeSelectable ? selectedKeys : []}
          checkedKeys={checkedKeysForTree}
          onSelect={treeSelectable ? handleSelectFolders : undefined}
          onCheck={onCheckProp}
          loadData={loadDataProp}
          defaultExpandAll={viewMode === 'tag' && selectMode === 'nodes'}
          defaultExpandedKeys={
            viewMode === 'folder' && treeData.length > 0 ? [treeData[0].key] : []
          }
          switcherIcon={
            <span>
              <LuChevronDown size={14} />
            </span>
          }
        />
      </div>
    </div>
  );
};

export default TreeNav;
