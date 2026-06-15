import type { DataNode } from '@/components/Common/Tree';
import type { DriveNode, LoadMoreNode } from '@/domains/Drive';
import DriveTreeNodeTitle from './DriveTreeNodeTitle';
import styles from './style.module.less';

interface BuildTreeDataOptions {
  renderableTypes: Set<'folder' | 'resource' | 'link' | 'trash'>;
  selectableTypes: Set<'folder' | 'resource' | 'link'>;
  disabledNodeIds: Set<string>;
  onLoadMoreClick: (node: LoadMoreNode) => void;
}

export function buildDriveTreeData(
  nodes: DriveNode[],
  options: BuildTreeDataOptions,
  nodeMap: Map<string, DriveNode>
): DataNode[] {
  const result: DataNode[] = [];
  for (const node of nodes) {
    if (node.type !== 'loadMore' && !options.renderableTypes.has(node.type)) continue;
    nodeMap.set(node.id, node);
    result.push(toTreeDataNode(node, options));
  }
  return result;
}

export function replaceTreeNodeChildren(
  nodes: DataNode[],
  targetKey: string,
  children: DataNode[]
): DataNode[] {
  return nodes.map((node) => {
    if (String(node.key) === targetKey) {
      return { ...node, children };
    }
    if (!node.children || node.children.length === 0) return node;
    return {
      ...node,
      children: replaceTreeNodeChildren(node.children, targetKey, children),
    };
  });
}

function toTreeDataNode(node: DriveNode, options: BuildTreeDataOptions): DataNode {
  if (node.type === 'loadMore') {
    return {
      key: node.id,
      title: (
        <span
          className={styles.loadMoreBtn}
          role="button"
          tabIndex={0}
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            options.onLoadMoreClick(node);
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              event.stopPropagation();
              options.onLoadMoreClick(node);
            }
          }}
        >
          加载更多（已加载 {node.loaded} / 共 {node.total}）
        </span>
      ),
      selectable: false,
      checkable: false,
      isLeaf: true,
    };
  }

  const selectable = node.type === 'trash' ? false : options.selectableTypes.has(node.type);
  const disabled = options.disabledNodeIds.has(node.id);
  const title = <DriveTreeNodeTitle node={node} />;

  if (node.type === 'folder') {
    return {
      key: node.id,
      title,
      selectable: selectable && !disabled,
      checkable: selectable && !disabled,
      disabled,
      isLeaf: false,
    };
  }

  return {
    key: node.id,
    title,
    selectable: selectable && !disabled,
    checkable: selectable && !disabled,
    disabled,
    isLeaf: true,
  };
}
