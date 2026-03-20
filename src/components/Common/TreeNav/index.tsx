import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Tree, Spin, Empty, Button } from 'antd';
import type { TreeProps } from 'antd';
import type { DataNode } from 'antd/es/tree';
import { AiOutlineFolder, AiOutlineTag } from 'react-icons/ai';
import FileTypeIcon from '@/components/Common/FileTypeIcon';
import { LuFolderPlus, LuChevronDown } from 'react-icons/lu';
import { useFolderService, useTagService } from '@/contexts/ServicesContext';
import type { Folder } from '@/types/folder';
import type { ResourceItem } from '@/types/resource';
import type { TagTreeNode } from '@/services/Tag/index.type';
import { getFolderDisplayName } from '@/utils/path';
import { parseErrorMessage } from '@/utils/parseErrorMessage';
import { NewFolderModal } from '@/components/Drive/Modals';
import { useAppMessage } from '@/hooks/useAppMessage';
import type { TreeNavProps } from './index.type';
import styles from './style.module.less';

const FOLDER_NAV_FILE_PAGE_SIZE = 5;
const ROOT_PATH = '/';
const ROOT_DISPLAY_NAME = '~';

/** 根节点对应的 Folder（用于 onSelect 回传） */
const ROOT_FOLDER: Folder = {
  tagId: 'path-root',
  tagName: ROOT_PATH,
};

const MORE_NODE_KEY_PREFIX = '__more__:';

/** 递归更新树中某节点的 children */
function updateNodeChildren(
  nodes: DataNode[],
  targetKey: React.Key,
  children: DataNode[]
): DataNode[] {
  return nodes.map((node) => {
    if (node.key === targetKey) {
      return { ...node, children, isLeaf: false };
    }
    if (node.children?.length) {
      return {
        ...node,
        children: updateNodeChildren(node.children, targetKey, children),
      };
    }
    return node;
  });
}

type ItemMap = Map<string, { type: 'file'; data: ResourceItem } | { type: 'folder'; data: Folder }>;

/** 创建文件夹节点（根与子文件夹共用） */
function createFolderNode(
  path: string,
  displayName: string,
  folderData: Folder,
  itemMap: ItemMap,
  children?: DataNode[]
): DataNode {
  itemMap.set(path, { type: 'folder', data: folderData });
  return {
    key: path,
    title: (
      <span className={styles.nodeTitle}>
        <AiOutlineFolder size={14} color="var(--ant-color-warning)" />
        {displayName}
      </span>
    ),
    isLeaf: false,
    children,
  };
}

/** 与原 TagTree 一致：排除无 tagId 或空名的节点 */
function isValidTagNavNode(node: TagTreeNode): boolean {
  return Boolean(node?.tagId && (node.tagName ?? '').trim());
}

/** 将 TagTreeNode 转为 DataNode（仅 tag 结构），并写入 itemMap */
function tagTreeNodeToDataNode(node: TagTreeNode, itemMap: ItemMap): DataNode | null {
  if (!isValidTagNavNode(node)) return null;
  const childNodes =
    node.children
      ?.map((c) => tagTreeNodeToDataNode(c, itemMap))
      .filter((n): n is DataNode => n != null) ?? [];
  const key = node.tagId;
  itemMap.set(key, { type: 'folder', data: node as Folder });
  const hasChildren = childNodes.length > 0;
  return {
    key,
    title: (
      <span className={styles.nodeTitle}>
        <AiOutlineTag size={14} color="var(--ant-color-primary)" />
        {node.tagName}
      </span>
    ),
    isLeaf: !hasChildren,
    children: hasChildren ? childNodes : undefined,
  };
}

/** 将全量 tag 树转为 DataNode[] */
function tagTreeToDataNodes(nodes: TagTreeNode[], itemMap: ItemMap): DataNode[] {
  return nodes
    .map((node) => tagTreeNodeToDataNode(node, itemMap))
    .filter((n): n is DataNode => n != null);
}

/** 在树中查找某节点的父节点 tagId，根下节点返回 undefined */
function findParentTagId(
  nodes: TagTreeNode[],
  childTagId: string,
  parentTagId?: string
): string | undefined {
  for (const node of nodes) {
    if (node.tagId === childTagId) return parentTagId;
    if (node.children?.length) {
      const found = findParentTagId(node.children, childTagId, node.tagId);
      if (found !== undefined) return found;
    }
  }
  return undefined;
}

/** 将 getResByFolder 响应转为 DataNode[] */
function toDataNodes(
  itemMap: ItemMap,
  path: string,
  folders: Folder[],
  files: ResourceItem[],
  totalFiles: number
): DataNode[] {
  const nodes: DataNode[] = [];

  for (const f of folders) {
    const pathKey = f.tagName ?? '/';
    nodes.push(createFolderNode(pathKey, getFolderDisplayName(pathKey), f, itemMap, undefined));
  }

  for (const f of files) {
    const key = `file-${f.resourceId}`;
    itemMap.set(key, { type: 'file', data: f });
    nodes.push({
      key,
      title: (
        <span className={styles.nodeTitle}>
          <FileTypeIcon
            resourceType={f.resourceType}
            size={14}
            color="var(--ant-color-text-secondary)"
          />
          {f.resourceName || '未命名'}
        </span>
      ),
      isLeaf: true,
      selectable: false,
    });
  }

  if (totalFiles > FOLDER_NAV_FILE_PAGE_SIZE) {
    const moreKey = `${MORE_NODE_KEY_PREFIX}${path}`;
    nodes.push({
      key: moreKey,
      title: (
        <span className={styles.moreHint}>
          … 还有 {totalFiles - FOLDER_NAV_FILE_PAGE_SIZE} 个文件
        </span>
      ),
      isLeaf: true,
      selectable: false,
    });
  }

  return nodes;
}

const TreeNav: React.FC<TreeNavProps> = ({
  onSelect,
  showNewFolderButton = true,
  rootPath = ROOT_PATH,
  className,
  mode = 'folder',
  embedMode = false,
  defaultSelectedKey,
  tagTreeGroupId,
  tagTreeRefreshTrigger = 0,
  tagTreeDraggable = false,
  onTagTreeStructureChange,
  tagSelectionControlled = false,
  tagSelectedKey = null,
}) => {
  const folderService = useFolderService();
  const tagService = useTagService();
  const message = useAppMessage();
  const [treeData, setTreeData] = useState<DataNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedKey, setSelectedKey] = useState<React.Key | null>(defaultSelectedKey ?? null);
  const [newFolderModalOpen, setNewFolderModalOpen] = useState(false);
  const [tagDropLoading, setTagDropLoading] = useState(false);

  const cacheRef = useRef<Map<string, DataNode[]>>(new Map());
  const itemMapRef = useRef<ItemMap>(new Map());
  const rawTagTreeRef = useRef<TagTreeNode[]>([]);

  /** 拉取某路径下的子节点（folder mode） */
  const fetchChildren = useCallback(
    async (path: string): Promise<DataNode[]> => {
      const res = await folderService.getResByFolder({
        path,
        filePage: 1,
        filePageSize: FOLDER_NAV_FILE_PAGE_SIZE,
      });
      return toDataNodes(itemMapRef.current, path, res.folders, res.files, res.totalFiles);
    },
    [folderService]
  );

  /** 拉取根节点（folder mode） */
  const fetchRoot = useCallback(async () => {
    setLoading(true);
    try {
      const children = await fetchChildren(rootPath);
      cacheRef.current.set(rootPath, children);
      const rootNode = createFolderNode(
        rootPath,
        ROOT_DISPLAY_NAME,
        ROOT_FOLDER,
        itemMapRef.current,
        children
      );
      setTreeData([rootNode]);
    } catch (err) {
      message.error(parseErrorMessage(err, '获取列表失败'));
      setTreeData([]);
    } finally {
      setLoading(false);
    }
  }, [rootPath, fetchChildren, message]);

  const loadTagTreeData = useCallback(async (): Promise<void> => {
    const nodes = await tagService.getTagTree(
      tagTreeGroupId ? { groupId: tagTreeGroupId } : undefined
    );
    rawTagTreeRef.current = nodes;
    itemMapRef.current.clear();
    setTreeData(tagTreeToDataNodes(nodes, itemMapRef.current));
  }, [tagService, tagTreeGroupId]);

  const fetchTagTree = useCallback(async () => {
    setLoading(true);
    try {
      await loadTagTreeData();
    } catch (err) {
      message.error(parseErrorMessage(err, '获取标签树失败'));
      setTreeData([]);
      rawTagTreeRef.current = [];
    } finally {
      setLoading(false);
    }
  }, [loadTagTreeData, tagTreeRefreshTrigger, message]);

  const handleTagDrop = useCallback(
    async (info: Parameters<NonNullable<TreeProps['onDrop']>>[0]) => {
      const { node, dragNode, dropToGap } = info;
      const targetTagId = String(dragNode.key);
      const dropKey = String(node.key);
      const newParentId = dropToGap ? findParentTagId(rawTagTreeRef.current, dropKey) : dropKey;

      setTagDropLoading(true);
      try {
        await tagService.moveTag({
          targetTagId,
          newParentId,
          ...(tagTreeGroupId ? { groupId: tagTreeGroupId } : {}),
        });
        message.success('标签已移动');
        try {
          await loadTagTreeData();
          onTagTreeStructureChange?.();
        } catch (e) {
          message.error(parseErrorMessage(e, '刷新标签树失败'));
        }
      } catch (err) {
        message.error(parseErrorMessage(err, '移动标签失败'));
        try {
          await loadTagTreeData();
        } catch {
          /* 保持当前展示 */
        }
      } finally {
        setTagDropLoading(false);
      }
    },
    [tagService, tagTreeGroupId, loadTagTreeData, onTagTreeStructureChange, message]
  );

  useEffect(() => {
    if (mode !== 'folder') return;
    void fetchRoot();
  }, [mode, fetchRoot]);

  useEffect(() => {
    if (mode !== 'tag') return;
    void fetchTagTree();
  }, [mode, fetchTagTree]);

  useEffect(() => {
    if (embedMode && defaultSelectedKey !== undefined) {
      setSelectedKey(defaultSelectedKey || null);
    }
  }, [embedMode, defaultSelectedKey]);

  const handleLoadData = useCallback(
    async (node: DataNode) => {
      if (mode === 'tag') return;
      const path = node.key as string;
      if (cacheRef.current.has(path)) return;

      try {
        const children = await fetchChildren(path);
        cacheRef.current.set(path, children);
        setTreeData((prev) => updateNodeChildren(prev, path, children));
      } catch (err) {
        message.error(parseErrorMessage(err, '加载子节点失败'));
      }
    },
    [mode, fetchChildren, message]
  );

  const isTagControlled = mode === 'tag' && tagSelectionControlled;

  const handleSelect = useCallback(
    (selectedKeys: React.Key[]) => {
      if (isTagControlled) {
        const key = selectedKeys.length ? String(selectedKeys[0]) : null;
        if (key === null) {
          onSelect?.(null);
          return;
        }
        if (tagSelectedKey != null && key === tagSelectedKey) {
          onSelect?.(null);
          return;
        }
        const item = itemMapRef.current.get(key);
        if (item) onSelect?.(item);
        return;
      }
      if (selectedKeys.length === 0) {
        setSelectedKey(null);
        onSelect?.(null);
        return;
      }
      const key = selectedKeys[0];
      setSelectedKey(key);
      const item = itemMapRef.current.get(String(key));
      if (item) onSelect?.(item);
    },
    [isTagControlled, tagSelectedKey, onSelect]
  );

  const treeSelectedKeys = isTagControlled
    ? tagSelectedKey
      ? [tagSelectedKey]
      : []
    : selectedKey
      ? [selectedKey]
      : [];

  const handleNewFolder = useCallback(() => {
    setNewFolderModalOpen(true);
  }, []);

  const handleNewFolderSuccess = useCallback(() => {
    const path = (selectedKey as string) ?? rootPath;
    cacheRef.current.delete(path);
    setNewFolderModalOpen(false);
    if (path === rootPath) {
      fetchRoot();
    } else {
      fetchChildren(path).then((children) => {
        cacheRef.current.set(path, children);
        setTreeData((prev) => updateNodeChildren(prev, path, children));
      });
    }
  }, [selectedKey, rootPath, fetchRoot, fetchChildren]);

  const handleNewFolderCancel = useCallback(() => {
    setNewFolderModalOpen(false);
  }, []);

  const parentPath = (selectedKey as string) ?? rootPath;

  if (loading && treeData.length === 0) {
    return (
      <div className={`${styles.wrapper} ${className ?? ''}`}>
        <Spin />
      </div>
    );
  }

  if (!loading && treeData.length === 0) {
    return (
      <div className={`${styles.wrapper} ${className ?? ''}`}>
        <Empty description={mode === 'tag' ? '暂无标签' : '暂无内容'} />
        {!embedMode && showNewFolderButton && mode === 'folder' && (
          <Button
            type="link"
            size="small"
            icon={<LuFolderPlus size={14} />}
            onClick={handleNewFolder}
            className={styles.newFolderBtn}
          >
            新建文件夹
          </Button>
        )}
        {!embedMode && (
          <NewFolderModal
            open={newFolderModalOpen}
            onCancel={handleNewFolderCancel}
            onSuccess={handleNewFolderSuccess}
            parentPath={parentPath}
          />
        )}
      </div>
    );
  }

  return (
    <div className={`${styles.wrapper} ${className ?? ''}`}>
      {!embedMode && showNewFolderButton && mode === 'folder' && (
        <Button
          type="text"
          size="small"
          icon={<LuFolderPlus size={14} />}
          onClick={handleNewFolder}
          className={styles.newFolderBtn}
        >
          新建文件夹
        </Button>
      )}
      <div className={`${styles.treeArea} ${tagDropLoading ? styles.treeDropBusy : ''}`}>
        {tagDropLoading && mode === 'tag' && tagTreeDraggable && (
          <div className={styles.dropBusyMask}>
            <Spin size="small" />
          </div>
        )}
        <Tree
          loadData={mode === 'folder' ? handleLoadData : undefined}
          treeData={treeData}
          className={styles.tree}
          selectedKeys={treeSelectedKeys}
          onSelect={handleSelect}
          draggable={mode === 'tag' && tagTreeDraggable && !tagDropLoading}
          onDrop={mode === 'tag' && tagTreeDraggable ? handleTagDrop : undefined}
          showLine={mode === 'tag' && tagTreeDraggable}
          switcherIcon={
            <span>
              <LuChevronDown size={14} />
            </span>
          }
          {...(mode === 'tag' && tagTreeDraggable
            ? { defaultExpandAll: true as const }
            : {
                defaultExpandedKeys: mode === 'folder' ? [rootPath] : [],
                defaultExpandAll: false as const,
              })}
          blockNode={true}
        />
      </div>
      {!embedMode && (
        <NewFolderModal
          open={newFolderModalOpen}
          onCancel={handleNewFolderCancel}
          onSuccess={handleNewFolderSuccess}
          parentPath={parentPath}
        />
      )}
    </div>
  );
};

export default TreeNav;
