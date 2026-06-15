import { Empty, Spin } from '@/components/Common/Feedback';
import type { DataNode } from '@/components/Common/Tree';
import Tree from '@/components/Common/Tree';
import { useDriveService } from '@/domains';
import type { DriveNode, LoadMoreNode } from '@/domains/Drive';
import { useRequest } from 'ahooks';
import { ChevronDown } from 'lucide-react';
import { useCallback, useMemo, useRef, useState } from 'react';
import { resolveDriveScope, toDriveSelectionItem } from '../common/driveComponentModel';
import { useDriveTreeChildren } from '../common/useDriveTreeChildren';
import { buildDriveTreeData, replaceTreeNodeChildren } from './buildTreeData';
import type { DriveNavProps } from './index.type';
import styles from './style.module.less';

const DEFAULT_RENDERABLE_TYPES: Array<'folder' | 'resource' | 'link' | 'trash'> = [
  'folder',
  'resource',
  'link',
  'trash',
];
const DEFAULT_SELECTABLE_TYPES: Array<'folder' | 'resource' | 'link'> = ['folder'];

function buildSetFromStableKey<T extends string>(key: string): Set<T> {
  if (!key) return new Set<T>();
  return new Set(key.split('\u0001') as T[]);
}

function DriveNav({
  rootId,
  scope,
  groupId,
  renderableTypes = DEFAULT_RENDERABLE_TYPES,
  selectableTypes = DEFAULT_SELECTABLE_TYPES,
  disabledNodeIds,
  multiple = false,
  initialSelectedIds,
  refreshTrigger = 0,
  onChange,
  onNodeChange,
}: DriveNavProps) {
  const driveService = useDriveService();
  const resolvedScope = useMemo(() => resolveDriveScope(scope, groupId), [scope, groupId]);
  const finalRootId = rootId ?? resolvedScope.rootId;
  const finalGroupId = resolvedScope.groupId;
  const { loadChildren, loadMore, reset } = useDriveTreeChildren({ groupId: finalGroupId });
  const nodeMapRef = useRef<Map<string, DriveNode>>(new Map());
  const [treeData, setTreeData] = useState<DataNode[]>([]);
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [checkedKeys, setCheckedKeys] = useState<string[]>([]);
  const renderableTypeKey = [...renderableTypes].sort().join('\u0001');
  const selectableTypeKey = [...selectableTypes].sort().join('\u0001');
  const disabledNodeIdKey = [...(disabledNodeIds ?? [])].sort().join('\u0001');

  const renderableTypeSet = useMemo(
    () => buildSetFromStableKey<'folder' | 'resource' | 'link' | 'trash'>(renderableTypeKey),
    [renderableTypeKey]
  );
  const selectableTypeSet = useMemo(
    () => buildSetFromStableKey<'folder' | 'resource' | 'link'>(selectableTypeKey),
    [selectableTypeKey]
  );
  const disabledNodeIdSet = useMemo(
    () => buildSetFromStableKey(disabledNodeIdKey),
    [disabledNodeIdKey]
  );

  const emitSelectionChange = useCallback(
    (keys: string[]) => {
      const selectedNodes = keys
        .map((key) => nodeMapRef.current.get(key))
        .filter(
          (node): node is DriveNode =>
            node != null &&
            node.type !== 'loadMore' &&
            node.type !== 'trash' &&
            !disabledNodeIdSet.has(node.id) &&
            selectableTypeSet.has(node.type)
        );
      onNodeChange?.(selectedNodes);
      onChange?.(selectedNodes.map(toDriveSelectionItem).filter((item) => item != null));
    },
    [disabledNodeIdSet, onChange, onNodeChange, selectableTypeSet]
  );

  const normalizeSelectableKeys = useCallback(
    (keys: string[]) => {
      return keys.filter((key) => {
        const node = nodeMapRef.current.get(key);
        return (
          node != null &&
          node.type !== 'loadMore' &&
          node.type !== 'trash' &&
          !disabledNodeIdSet.has(node.id) &&
          selectableTypeSet.has(node.type)
        );
      });
    },
    [disabledNodeIdSet, selectableTypeSet]
  );

  function buildChildrenData(nodes: DriveNode[]): DataNode[] {
    return buildDriveTreeData(
      nodes,
      {
        renderableTypes: renderableTypeSet,
        selectableTypes: selectableTypeSet,
        disabledNodeIds: disabledNodeIdSet,
        onLoadMoreClick: (node) => void handleLoadMore(node),
      },
      nodeMapRef.current
    );
  }

  async function handleLoadMore(node: LoadMoreNode): Promise<void> {
    const children = await loadMore(node);
    const childData = buildChildrenData(children);
    setTreeData((prev) => replaceTreeNodeChildren(prev, node.parentId, childData));
  }

  const { loading } = useRequest(
    async (): Promise<DataNode[]> => {
      nodeMapRef.current.clear();
      reset();

      const rootNode = await driveService.getDriveTree({
        rootId: finalRootId,
        groupId: finalGroupId,
      });
      const baseRoot = buildDriveTreeData(
        [rootNode],
        {
          renderableTypes: renderableTypeSet,
          selectableTypes: selectableTypeSet,
          disabledNodeIds: disabledNodeIdSet,
          onLoadMoreClick: (node) => void handleLoadMore(node),
        },
        nodeMapRef.current
      )[0];
      if (!baseRoot) return [];

      if (rootNode.type !== 'folder') return [baseRoot];

      const children = await loadChildren(rootNode.id);
      const childData = buildChildrenData(children);
      return [{ ...baseRoot, children: childData }];
    },
    {
      refreshDeps: [
        finalRootId,
        finalGroupId,
        refreshTrigger,
        renderableTypeKey,
        selectableTypeKey,
        disabledNodeIdKey,
      ],
      onSuccess: (data) => {
        setTreeData(data);
        const initialKeys = normalizeSelectableKeys(initialSelectedIds ?? []);
        if (multiple) {
          setCheckedKeys(initialKeys);
          setSelectedKeys([]);
          emitSelectionChange(initialKeys);
          return;
        }
        const firstKey = initialKeys[0];
        const nextSelected = firstKey ? [firstKey] : [];
        setSelectedKeys(nextSelected);
        setCheckedKeys([]);
        emitSelectionChange(nextSelected);
      },
    }
  );

  const handleLoadData = async (treeNode: DataNode) => {
    const key = String(treeNode.key);
    const node = nodeMapRef.current.get(key);
    if (!node || (node.type !== 'folder' && node.type !== 'trash')) return;
    const children = await loadChildren(node.id);
    const childData = buildChildrenData(children);
    setTreeData((prev) => replaceTreeNodeChildren(prev, node.id, childData));
  };

  const handleSelect = useCallback(
    (keys: React.Key[], info: { node: DataNode; selected: boolean }) => {
      if (multiple) {
        const clickedKey = String(info.node.key);
        if (normalizeSelectableKeys([clickedKey]).length === 0) return;
        setCheckedKeys((prev) => {
          const nextKeys = prev.includes(clickedKey)
            ? prev.filter((key) => key !== clickedKey)
            : [...prev, clickedKey];
          const normalized = normalizeSelectableKeys(nextKeys);
          emitSelectionChange(normalized);
          return normalized;
        });
        return;
      }
      const rawKeys = keys.map(String);
      // Ant Tree toggles an already selected node to an empty key list. In picker modals,
      // clicking a selectable folder should keep it selected rather than immediately clearing it.
      const nextKeys = info.selected ? rawKeys : [String(info.node.key)];
      const normalized = normalizeSelectableKeys(nextKeys);
      const next = normalized.length > 0 ? [normalized[0]!] : [];
      setSelectedKeys(next);
      emitSelectionChange(next);
    },
    [emitSelectionChange, multiple, normalizeSelectableKeys]
  );

  const handleCheck = useCallback(
    (checked: React.Key[] | { checked: React.Key[]; halfChecked: React.Key[] }) => {
      const keys = Array.isArray(checked) ? checked.map(String) : checked.checked.map(String);
      const normalized = normalizeSelectableKeys(keys);
      setCheckedKeys(normalized);
      emitSelectionChange(normalized);
    },
    [normalizeSelectableKeys, emitSelectionChange]
  );

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
        <Empty description="暂无内容" />
      </div>
    );
  }

  return (
    <div className={styles.wrapper}>
      <Tree
        treeData={treeData}
        className={styles.tree}
        blockNode
        checkable={multiple}
        checkStrictly={multiple}
        selectable
        selectedKeys={!multiple ? selectedKeys : []}
        checkedKeys={multiple ? checkedKeys : undefined}
        onSelect={handleSelect}
        onCheck={multiple ? handleCheck : undefined}
        loadData={handleLoadData}
        defaultExpandedKeys={[finalRootId]}
        switcherIcon={
          <span>
            <ChevronDown size={14} />
          </span>
        }
      />
    </div>
  );
}

export default DriveNav;
