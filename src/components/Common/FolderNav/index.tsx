import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Tree, Spin, Empty, Button, message } from 'antd';
import type { DataNode } from 'antd/es/tree';
import { AiOutlineFileText, AiOutlineFolder } from 'react-icons/ai';
import { LuFolderPlus, LuChevronDown } from 'react-icons/lu';
import { TagServices } from '@/services/Tag';
import type { TagTreeNode } from '@/services/Tag/index.type';
import type { ResourceItem } from '@/types/resource';
import { getFolderDisplayName } from '@/utils/path';
import { parseErrorMessage } from '@/utils/parseErrorMessage';
import { NewFolderModal } from '@/components/Drive/Modals';
import type { FolderNavProps } from './index.type';
import styles from './style.module.less';

const FOLDER_NAV_FILE_PAGE_SIZE = 5;
const ROOT_PATH = '/';
const ROOT_DISPLAY_NAME = '~';

/** 根节点对应的 TagTreeNode（用于 onSelect 回传） */
const ROOT_TAG_NODE: TagTreeNode = {
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

type ItemMap = Map<
  string,
  { type: 'file'; data: ResourceItem } | { type: 'folder'; data: TagTreeNode }
>;

/** 创建文件夹节点（根与子文件夹共用） */
function createFolderNode(
  path: string,
  displayName: string,
  folderData: TagTreeNode,
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

/** 将 getListByPath 响应转为 DataNode[] */
function toDataNodes(
  itemMap: ItemMap,
  path: string,
  folders: TagTreeNode[],
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
          <AiOutlineFileText size={14} color="var(--ant-color-text-secondary)" />
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

const FolderNav: React.FC<FolderNavProps> = ({
  onSelect,
  showNewFolderButton = true,
  rootPath = ROOT_PATH,
  className,
}) => {
  const [treeData, setTreeData] = useState<DataNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedKey, setSelectedKey] = useState<React.Key | null>(null);
  const [newFolderModalOpen, setNewFolderModalOpen] = useState(false);

  const cacheRef = useRef<Map<string, DataNode[]>>(new Map());
  const itemMapRef = useRef<ItemMap>(new Map());

  /** 拉取某路径下的子节点 */
  const fetchChildren = useCallback(async (path: string): Promise<DataNode[]> => {
    const res = await TagServices.getListByPath({
      path,
      filePage: 1,
      filePageSize: FOLDER_NAV_FILE_PAGE_SIZE,
    });
    return toDataNodes(itemMapRef.current, path, res.folders, res.files, res.totalFiles);
  }, []);

  /** 拉取根节点（与子节点拉取共用 fetchChildren，根多一层 createFolderNode 包装） */
  const fetchRoot = useCallback(async () => {
    setLoading(true);
    try {
      const children = await fetchChildren(rootPath);
      cacheRef.current.set(rootPath, children);
      const rootNode = createFolderNode(
        rootPath,
        ROOT_DISPLAY_NAME,
        ROOT_TAG_NODE,
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
  }, [rootPath, fetchChildren]);

  useEffect(() => {
    fetchRoot();
  }, [fetchRoot]);

  const handleLoadData = useCallback(
    async (node: DataNode) => {
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
    [fetchChildren]
  );

  const handleSelect = useCallback(
    (selectedKeys: React.Key[], info: { node: DataNode }) => {
      if (selectedKeys.length === 0) {
        setSelectedKey(null);
        return;
      }
      const key = info.node.key;
      setSelectedKey(key);
      const item = itemMapRef.current.get(String(key));
      if (item) onSelect?.(item);
    },
    [onSelect]
  );

  const handleNewFolder = useCallback(() => {
    setNewFolderModalOpen(true);
  }, []);

  const handleNewFolderSuccess = useCallback(() => {
    const path = (selectedKey as string) ?? rootPath;
    /** 删除当前选中节点路径缓存 */
    cacheRef.current.delete(path);
    /** 关闭新建文件夹弹窗 */
    setNewFolderModalOpen(false);
    /** 重新拉取根节点 */
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
        <Empty description="暂无内容" />
        {showNewFolderButton && (
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
        <NewFolderModal
          open={newFolderModalOpen}
          onCancel={handleNewFolderCancel}
          onSuccess={handleNewFolderSuccess}
          parentPath={parentPath}
        />
      </div>
    );
  }

  return (
    <div className={`${styles.wrapper} ${className ?? ''}`}>
      {showNewFolderButton && (
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
      <Tree
        loadData={handleLoadData}
        treeData={treeData}
        className={styles.tree}
        selectedKeys={selectedKey ? [selectedKey] : []}
        onSelect={handleSelect}
        switcherIcon={
          <span>
            <LuChevronDown size={14} />
          </span>
        }
        defaultExpandedKeys={[rootPath]}
        defaultExpandAll={false}
        blockNode={true}
      />
      <NewFolderModal
        open={newFolderModalOpen}
        onCancel={handleNewFolderCancel}
        onSuccess={handleNewFolderSuccess}
        parentPath={parentPath}
      />
    </div>
  );
};

export default FolderNav;
