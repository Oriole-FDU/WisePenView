import React, { useEffect, useState } from 'react';
import { Tree, Spin, Empty, message, Tag } from 'antd';
import type { DataNode } from 'antd/es/tree';
import { TagServices } from '@/services/Tag';
import type { TagTreeNode } from '@/services/Tag';
import { parseErrorMessage } from '@/utils/parseErrorMessage';
import type { TagTreeProps } from './index.type';
import styles from './style.module.less';
import { LuChevronDown } from 'react-icons/lu';

/** 判断节点是否有效（排除空叶子节点） */
const isValidNode = (node: TagTreeNode): boolean =>
  Boolean(node?.tagId && (node.tagName ?? '').trim());

/** 在树中按 tagId 查找节点 */
const findNodeByTagId = (
  nodes: TagTreeNode[],
  tagId: string
): TagTreeNode | null => {
  for (const node of nodes) {
    if (node.tagId === tagId) return node;
    if (node.children?.length) {
      const found = findNodeByTagId(node.children, tagId);
      if (found) return found;
    }
  }
  return null;
};

/** 将 TagTreeNode 转为 antd Tree 的 DataNode，节点标题用 Tag 展示，过滤无效节点 */
const toTreeDataNode = (node: TagTreeNode): DataNode | null => {
  if (!isValidNode(node)) return null;
  const validChildren = node.children
    ?.map(toTreeDataNode)
    .filter((n): n is DataNode => n != null) ?? [];
  const hasChildren = validChildren.length > 0;
  return {
    key: node.tagId,
    title: (
        <Tag variant="outlined" className={styles.tagNode}>
          {node.tagName}
        </Tag>
    ),
    ...(hasChildren ? { children: validChildren } : { isLeaf: true }),
  };
};

const TagTree: React.FC<TagTreeProps> = ({
  groupId,
  onSelect,
  selectedKey,
  refreshTrigger,
  editable = true,
  defaultExpandAll = true,
}) => {
  const [loading, setLoading] = useState(true);
  const [treeData, setTreeData] = useState<DataNode[]>([]);
  const [rawList, setRawList] = useState<TagTreeNode[]>([]);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      try {
        const list = await TagServices.getUserTagTree(groupId ? { groupId } : undefined);
        setRawList(list);
        const nodes = list
          .map(toTreeDataNode)
          .filter((n): n is DataNode => n != null);
        setTreeData(nodes);
      } catch (err) {
        message.error(parseErrorMessage(err, '获取标签树失败'));
        setTreeData([]);
        setRawList([]);
      } finally {
        setLoading(false);
      }
    };

    fetch();
  }, [groupId, refreshTrigger]);

  const handleSelect = (selectedKeys: React.Key[], info: { node: { key: React.Key } }) => {
    if (selectedKeys.length === 0) {
      onSelect?.(null);
      return;
    }
    const tagId = String(info.node.key);
    const found = findNodeByTagId(rawList, tagId);
    onSelect?.(found ?? null);
  };

  if (loading) {
    return (
      <div className={styles.wrapper}>
        <Spin />
      </div>
    );
  }

  if (!treeData.length) {
    return (
      <div className={styles.wrapper}>
        <Empty description="暂无标签" />
      </div>
    );
  }

  return (
    <div className={styles.wrapper}>
      <Tree
        showLine
        draggable={editable}
        switcherIcon={
          <span className={styles.switcherIcon}>
            <LuChevronDown size={18} />
          </span>
        }
        defaultExpandAll={defaultExpandAll}
        treeData={treeData}
        className={styles.tree}
        selectedKeys={selectedKey ? [selectedKey] : []}
        onSelect={handleSelect}
      />
    </div>
  );
};

export default TagTree;
