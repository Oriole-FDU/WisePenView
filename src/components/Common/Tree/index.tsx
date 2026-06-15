import { useEffectForce } from '@/hooks/useEffectForce';
import clsx from 'clsx';
import { ChevronRight, LoaderCircle } from 'lucide-react';
import type { CSSProperties, Key, ReactNode } from 'react';
import { useCallback, useMemo, useState } from 'react';
import styles from './style.module.less';

export interface DataNode {
  key: Key;
  title?: ReactNode;
  children?: DataNode[];
  disabled?: boolean;
  selectable?: boolean;
  checkable?: boolean;
  isLeaf?: boolean;
}

export type TreeDataNode = DataNode;

type CheckedKeys = Key[] | { checked: Key[]; halfChecked: Key[] };

interface TreeSelectInfo {
  node: DataNode;
  selected: boolean;
}

interface TreeExpandInfo {
  node: DataNode;
  expanded: boolean;
}

export interface TreeProps {
  treeData?: DataNode[];
  className?: string;
  blockNode?: boolean;
  checkable?: boolean;
  checkStrictly?: boolean;
  selectable?: boolean;
  multiple?: boolean;
  selectedKeys?: Key[];
  checkedKeys?: CheckedKeys;
  expandedKeys?: Key[];
  defaultExpandedKeys?: Key[];
  defaultExpandAll?: boolean;
  expandAction?: 'click' | 'doubleClick' | false;
  switcherIcon?: ReactNode;
  loadData?: (node: DataNode) => Promise<void> | void;
  onSelect?: (selectedKeys: Key[], info: TreeSelectInfo) => void;
  onCheck?: (
    checkedKeys: Key[] | { checked: Key[]; halfChecked: Key[] },
    info: { node: DataNode; checked: boolean }
  ) => void;
  onExpand?: (expandedKeys: Key[], info: TreeExpandInfo) => void;
}

interface FlatNode {
  node: DataNode;
  level: number;
  key: string;
  expanded: boolean;
  expandable: boolean;
}

function normalizeKeys(keys: Key[] | undefined): string[] {
  return (keys ?? []).map(String);
}

function normalizeCheckedKeys(keys: CheckedKeys | undefined): string[] {
  if (!keys) return [];
  return Array.isArray(keys) ? normalizeKeys(keys) : normalizeKeys(keys.checked);
}

function keysSignature(keys: Key[] | undefined): string {
  return normalizeKeys(keys).join('\u0001');
}

function parseKeysSignature(signature: string): string[] {
  if (!signature) return [];
  return signature.split('\u0001');
}

function collectExpandableKeys(nodes: DataNode[] | undefined): string[] {
  const keys: string[] = [];

  function walk(items: DataNode[] | undefined): void {
    for (const item of items ?? []) {
      const expandable =
        item.isLeaf !== true && ((item.children?.length ?? 0) > 0 || item.isLeaf === false);
      if (expandable) keys.push(String(item.key));
      walk(item.children);
    }
  }

  walk(nodes);
  return keys;
}

function flattenNodes(nodes: DataNode[] | undefined, expandedKeySet: Set<string>): FlatNode[] {
  const result: FlatNode[] = [];

  function walk(items: DataNode[] | undefined, level: number): void {
    for (const node of items ?? []) {
      const key = String(node.key);
      const expandable =
        node.isLeaf !== true && ((node.children?.length ?? 0) > 0 || node.isLeaf === false);
      const expanded = expandedKeySet.has(key);
      result.push({ node, level, key, expanded, expandable });
      if (expanded) walk(node.children, level + 1);
    }
  }

  walk(nodes, 0);
  return result;
}

function buildNextKeys(keys: string[], key: string, enabled: boolean): string[] {
  const keySet = new Set(keys);
  if (enabled) keySet.add(key);
  else keySet.delete(key);
  return [...keySet];
}

function Tree({
  treeData = [],
  className,
  blockNode,
  checkable = false,
  selectable = true,
  multiple = false,
  selectedKeys,
  checkedKeys,
  expandedKeys,
  defaultExpandedKeys,
  defaultExpandAll = false,
  expandAction,
  switcherIcon,
  loadData,
  onSelect,
  onCheck,
  onExpand,
}: TreeProps) {
  const defaultExpandedSignature = keysSignature(defaultExpandedKeys);
  const [internalSelectedKeys, setInternalSelectedKeys] = useState<string[]>([]);
  const [internalCheckedKeys, setInternalCheckedKeys] = useState<string[]>([]);
  const [internalExpandedKeys, setInternalExpandedKeys] = useState<string[]>(() =>
    defaultExpandAll
      ? collectExpandableKeys(treeData)
      : parseKeysSignature(defaultExpandedSignature)
  );
  const [loadingKeys, setLoadingKeys] = useState<string[]>([]);

  const finalSelectedKeys = selectedKeys ? normalizeKeys(selectedKeys) : internalSelectedKeys;
  const finalCheckedKeys = checkedKeys ? normalizeCheckedKeys(checkedKeys) : internalCheckedKeys;
  const finalExpandedKeys = expandedKeys ? normalizeKeys(expandedKeys) : internalExpandedKeys;
  const expandedKeySet = useMemo(() => new Set(finalExpandedKeys), [finalExpandedKeys]);
  const checkedKeySet = useMemo(() => new Set(finalCheckedKeys), [finalCheckedKeys]);
  const selectedKeySet = useMemo(() => new Set(finalSelectedKeys), [finalSelectedKeys]);
  const loadingKeySet = useMemo(() => new Set(loadingKeys), [loadingKeys]);

  // 占位实现，Tree将重构
  useEffectForce(() => {
    if (expandedKeys) return;
    if (defaultExpandAll) return;
    setInternalExpandedKeys(parseKeysSignature(defaultExpandedSignature));
  }, [defaultExpandedSignature, defaultExpandAll, expandedKeys]);

  useEffectForce(() => {
    if (expandedKeys || !defaultExpandAll) return;
    setInternalExpandedKeys(collectExpandableKeys(treeData));
  }, [defaultExpandAll, expandedKeys, treeData]);

  const flatNodes = useMemo(
    () => flattenNodes(treeData, expandedKeySet),
    [expandedKeySet, treeData]
  );

  const emitExpandedKeys = useCallback(
    (nextKeys: string[], info: TreeExpandInfo) => {
      if (!expandedKeys) setInternalExpandedKeys(nextKeys);
      onExpand?.(nextKeys, info);
    },
    [expandedKeys, onExpand]
  );

  const runLoadData = useCallback(
    async (node: DataNode) => {
      const key = String(node.key);
      if (
        !loadData ||
        loadingKeySet.has(key) ||
        node.isLeaf === true ||
        node.children !== undefined
      )
        return;

      setLoadingKeys((prev) => (prev.includes(key) ? prev : [...prev, key]));
      try {
        await loadData(node);
      } finally {
        setLoadingKeys((prev) => prev.filter((item) => item !== key));
      }
    },
    [loadData, loadingKeySet]
  );

  const toggleExpand = useCallback(
    (node: DataNode, expanded: boolean) => {
      const key = String(node.key);
      const nextKeys = buildNextKeys(finalExpandedKeys, key, expanded);
      emitExpandedKeys(nextKeys, { node, expanded });
      if (expanded) void runLoadData(node);
    },
    [emitExpandedKeys, finalExpandedKeys, runLoadData]
  );

  const toggleSelect = useCallback(
    (node: DataNode) => {
      if (node.disabled || node.selectable === false || !selectable) return;

      const key = String(node.key);
      const selected = !selectedKeySet.has(key);
      const nextKeys = multiple
        ? buildNextKeys(finalSelectedKeys, key, selected)
        : selected
          ? [key]
          : [];

      if (!selectedKeys) setInternalSelectedKeys(nextKeys);
      onSelect?.(nextKeys, { node, selected });
    },
    [finalSelectedKeys, multiple, onSelect, selectable, selectedKeySet, selectedKeys]
  );

  const toggleCheck = useCallback(
    (node: DataNode) => {
      if (node.disabled || node.checkable === false) return;

      const key = String(node.key);
      const checked = !checkedKeySet.has(key);
      const nextKeys = buildNextKeys(finalCheckedKeys, key, checked);

      if (!checkedKeys) setInternalCheckedKeys(nextKeys);
      onCheck?.(nextKeys, { node, checked });
    },
    [checkedKeySet, checkedKeys, finalCheckedKeys, onCheck]
  );

  const renderSwitcherIcon = (expanded: boolean, loading: boolean): ReactNode => {
    if (loading) return <LoaderCircle size={14} className={styles.loadingIcon} />;
    if (switcherIcon) return switcherIcon;
    return <ChevronRight size={14} />;
  };

  return (
    <div
      className={clsx(
        styles.tree,
        'file-tree',
        'wisepen-tree',
        blockNode && styles.blockNode,
        className
      )}
      role="tree"
    >
      {flatNodes.map(({ node, level, key, expanded, expandable }) => {
        const checked = checkedKeySet.has(key);
        const selected = selectedKeySet.has(key);
        const loading = loadingKeySet.has(key);
        const showCheckbox = checkable && node.checkable !== false;
        const canCheck = showCheckbox && !node.disabled;
        const canSelect = selectable && node.selectable !== false && !node.disabled;
        const clickExpands = expandAction === 'click' && expandable;

        return (
          <div
            key={key}
            className={clsx(
              styles.row,
              'file-tree-item',
              'wisepen-tree__item',
              selected && styles.selected,
              node.disabled && styles.disabled
            )}
            role="treeitem"
            aria-expanded={expandable ? expanded : undefined}
            aria-selected={canSelect ? selected : undefined}
            aria-disabled={node.disabled || undefined}
            style={{ '--tree-node-level': level } as CSSProperties}
          >
            <div className={styles.indent} aria-hidden />

            {expandable ? (
              <button
                type="button"
                className={clsx(styles.switcher, 'wisepen-tree__switcher')}
                data-expanded={expanded}
                aria-label={expanded ? '收起节点' : '展开节点'}
                onClick={(event) => {
                  event.stopPropagation();
                  toggleExpand(node, !expanded);
                }}
              >
                <span className={styles.switcherIcon}>{renderSwitcherIcon(expanded, loading)}</span>
              </button>
            ) : (
              <span className={styles.switcherPlaceholder} aria-hidden />
            )}

            {showCheckbox ? (
              <input
                className={clsx(styles.checkbox, 'wisepen-tree__checkbox')}
                type="checkbox"
                checked={checked}
                disabled={!canCheck}
                aria-label="选择节点"
                onChange={() => toggleCheck(node)}
                onClick={(event) => event.stopPropagation()}
              />
            ) : null}

            <div
              className={clsx(styles.content, 'wisepen-tree__content')}
              data-selectable={canSelect}
              role={canSelect || clickExpands ? 'button' : undefined}
              tabIndex={canSelect || clickExpands ? 0 : undefined}
              onClick={() => {
                if (clickExpands && !canSelect) {
                  toggleExpand(node, !expanded);
                  return;
                }
                toggleSelect(node);
              }}
              onKeyDown={(event) => {
                if (event.key !== 'Enter' && event.key !== ' ') return;
                event.preventDefault();
                if (clickExpands && !canSelect) {
                  toggleExpand(node, !expanded);
                  return;
                }
                toggleSelect(node);
              }}
              onDoubleClick={() => {
                if (expandAction !== 'doubleClick' || !expandable) return;
                toggleExpand(node, !expanded);
              }}
            >
              <span className={clsx(styles.title, 'wisepen-tree__title')}>
                {node.title ?? String(node.key)}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default Tree;
