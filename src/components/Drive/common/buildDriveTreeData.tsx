import type { DataNode } from '@/components/Tree';
import type { DriveNode } from '@/domains/Drive';
import type { ReactNode } from 'react';
import type { DriveItemKind } from './driveComponentModel';

interface DriveNodeSelectionOptions {
  selectableTypes: Set<DriveItemKind>;
  disabledNodeIds: Set<string>;
  isNodeSelectable?: (node: DriveNode) => boolean;
  isNodeDisabled?: (node: DriveNode) => boolean;
}

interface BuildDriveTreeDataOptions extends DriveNodeSelectionOptions {
  renderableTypes: Set<DriveItemKind>;
  getTreeKey: (node: DriveNode) => string;
  renderTitle: (node: DriveNode) => ReactNode;
}

export function buildDriveTreeData(
  nodes: DriveNode[],
  options: BuildDriveTreeDataOptions,
  nodeMap: Map<string, DriveNode>
): DataNode[] {
  const result: DataNode[] = [];
  for (const node of nodes) {
    if (node.type !== 'loading' && !options.renderableTypes.has(node.type)) continue;
    const key = options.getTreeKey(node);
    nodeMap.set(key, node);
    result.push(toTreeDataNode(node, key, options));
  }
  return result;
}

export function replaceDriveTreeNodeChildren(
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
      children: replaceDriveTreeNodeChildren(node.children, targetKey, children),
    };
  });
}

export function isDriveNodeSelectable(
  node: DriveNode,
  options: DriveNodeSelectionOptions
): boolean {
  return (
    node.type !== 'loading' &&
    !options.disabledNodeIds.has(node.id) &&
    options.isNodeDisabled?.(node) !== true &&
    options.selectableTypes.has(node.type) &&
    (options.isNodeSelectable?.(node) ?? true)
  );
}

function resolveNodeState(node: DriveNode, options: BuildDriveTreeDataOptions) {
  const selectable = isDriveNodeSelectable(node, options);

  return {
    disabled: !selectable,
    selectable,
  };
}

function toTreeDataNode(
  node: DriveNode,
  key: string,
  options: BuildDriveTreeDataOptions
): DataNode {
  const title = options.renderTitle(node);

  if (node.type === 'loading') {
    return {
      key,
      title,
      disabled: true,
      selectable: false,
      checkable: false,
      isLeaf: true,
    };
  }

  const { selectable } = resolveNodeState(node, options);

  if (node.type === 'root' || node.type === 'folder') {
    return {
      key,
      title,
      selectable,
      checkable: false,
      disabled: !selectable,
      isLeaf: false,
    };
  }

  return {
    key,
    title,
    selectable,
    checkable: false,
    disabled: !selectable,
    isLeaf: true,
  };
}
