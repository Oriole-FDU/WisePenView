import type { Key, ReactNode } from 'react';

export interface DataNode {
  key: Key;
  title?: ReactNode;
  children?: DataNode[];
  disabled?: boolean;
  selectable?: boolean;
  checkable?: boolean;
  isLeaf?: boolean;
  draggable?: boolean;
}

export type TreeDataNode = DataNode;

export type CheckedKeys = Key[] | { checked: Key[]; halfChecked: Key[] };

interface TreeSelectInfo {
  node: DataNode;
  selected: boolean;
}

export interface TreeExpandInfo {
  node: DataNode;
  expanded: boolean;
}

export type TreeDropPosition = 'before' | 'inside' | 'after';

export interface TreeAllowDropInfo {
  dragNode: DataNode;
  dropNode: DataNode;
  dropPosition: TreeDropPosition;
}

export type TreeDropInfo = TreeAllowDropInfo;

export interface TreeProps {
  treeData?: DataNode[];
  className?: string;
  disabled?: boolean;
  blockNode?: boolean;
  checkable?: boolean;
  selectable?: boolean;
  multiple?: boolean;
  selectedKeys?: Key[];
  checkedKeys?: CheckedKeys;
  expandedKeys?: Key[];
  defaultExpandedKeys?: Key[];
  defaultExpandAll?: boolean;
  expandAction?: 'click' | 'doubleClick' | false;
  draggable?: boolean | ((node: DataNode) => boolean);
  allowDrop?: (info: TreeAllowDropInfo) => boolean;
  loadData?: (node: DataNode) => Promise<void> | void;
  onLoadError?: (error: unknown, node: DataNode) => void;
  onSelect?: (selectedKeys: Key[], info: TreeSelectInfo) => void;
  onCheck?: (
    checkedKeys: Key[] | { checked: Key[]; halfChecked: Key[] },
    info: { node: DataNode; checked: boolean }
  ) => void;
  onExpand?: (expandedKeys: Key[], info: TreeExpandInfo) => void;
  onDrop?: (info: TreeDropInfo) => void;
}
