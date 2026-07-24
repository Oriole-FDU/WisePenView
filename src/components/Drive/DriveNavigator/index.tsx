import { Empty, Spin } from '@/components/Feedback';
import type { DataNode } from '@/components/Tree';
import Tree from '@/components/Tree';
import { useDriveService, useGroupService } from '@/domains';
import type { DriveNode, DriveNodeScope } from '@/domains/Drive';
import type { FetchGroupListRequest, Group, IGroupService } from '@/domains/Group';
import { parseErrorMessage } from '@/utils/error';
import { toast } from '@heroui/react';
import { useRequest } from 'ahooks';
import { useCallback, useMemo, useRef, useState } from 'react';
import {
  buildDriveTreeData,
  isDriveNodeSelectable,
  replaceDriveTreeNodeChildren,
} from '../common/buildDriveTreeData';
import {
  getDriveScopeGroupId,
  resolveDriveScope,
  toDriveSelectionItem,
  type DriveItemKind,
  type DriveScope,
  type DriveSelectionItem,
} from '../common/driveComponentModel';
import DriveNavigatorNodeTitle from './DriveNavigatorNodeTitle';
import type { DriveNavigatorProps } from './index.type';
import styles from './style.module.less';

const DEFAULT_RENDERABLE_TYPES: DriveItemKind[] = ['root', 'folder', 'resource', 'link'];
const DEFAULT_SELECTABLE_TYPES: DriveItemKind[] = ['folder'];
const PERSONAL_SCOPE_KEY = 'personal';
const GROUP_SCOPE_PAGE_SIZE = 100;
const DEFAULT_RESOURCE_PREVIEW_LIMIT = 8;
const TREE_KEY_SEPARATOR = '\u001f';

interface DriveNavigatorScopeOption {
  scopeKey: string;
  label: string;
  scope: DriveScope;
  rootId: string;
  groupId?: string;
}

function buildSetFromStableKey<T extends string>(key: string): Set<T> {
  if (!key) return new Set<T>();
  return new Set(key.split('\u0001') as T[]);
}

function buildScopeKey(scope: DriveNodeScope): string {
  return scope.type === 'group' ? `group:${scope.groupId}` : PERSONAL_SCOPE_KEY;
}

function buildTreeKey(scopeKey: string, nodeId: string): string {
  // 多 scope 并列时 root/loading/folder 的 nodeId 可能重复，Tree key 需要额外带上 scope。
  return `${scopeKey}${TREE_KEY_SEPARATOR}${nodeId}`;
}

function buildScopeOption(
  scope: DriveScope | undefined,
  label?: string
): DriveNavigatorScopeOption {
  const resolved = resolveDriveScope(scope);
  const finalScope: DriveScope =
    resolved.scope.type === 'group'
      ? { type: 'group', groupId: resolved.scope.groupId }
      : { type: 'personal' };

  return {
    scopeKey: buildScopeKey(resolved.scope),
    label: label ?? (resolved.scope.type === 'group' ? '小组云盘' : '个人云盘'),
    scope: finalScope,
    rootId: resolved.rootId,
    groupId: resolved.groupId,
  };
}

function buildSingleScopeOption(
  scope: DriveNodeScope,
  rootId: string,
  groupId?: string
): DriveNavigatorScopeOption {
  const finalScope: DriveScope =
    scope.type === 'group' ? { type: 'group', groupId: scope.groupId } : { type: 'personal' };

  return {
    scopeKey: buildScopeKey(scope),
    label: scope.type === 'group' ? '小组云盘' : '个人云盘',
    scope: finalScope,
    rootId,
    groupId,
  };
}

async function fetchGroupsByRole(
  groupService: IGroupService,
  groupRoleFilter: FetchGroupListRequest['groupRoleFilter']
): Promise<Group[]> {
  const groups: Group[] = [];
  let page = 1;

  while (true) {
    const data = await groupService.fetchGroupList({
      groupRoleFilter,
      page,
      size: GROUP_SCOPE_PAGE_SIZE,
    });
    groups.push(...data.groups);

    if (
      data.groups.length === 0 ||
      data.groups.length < GROUP_SCOPE_PAGE_SIZE ||
      (data.total > 0 && groups.length >= data.total)
    ) {
      break;
    }
    page += 1;
  }

  return groups;
}

function mergeScopeGroups(groups: Group[]): Group[] {
  const groupMap = new Map<string, Group>();
  for (const group of groups) {
    if (!group.groupId || groupMap.has(group.groupId)) continue;
    groupMap.set(group.groupId, group);
  }
  return [...groupMap.values()];
}

async function fetchAllScopeOptions(
  groupService: IGroupService,
  includePersonal: boolean,
  excludedGroupIds: Set<string>
): Promise<DriveNavigatorScopeOption[]> {
  const [joinedGroups, managedGroups] = await Promise.all([
    fetchGroupsByRole(groupService, 'JOINED'),
    fetchGroupsByRole(groupService, 'MANAGED'),
  ]);
  const groups = mergeScopeGroups([...joinedGroups, ...managedGroups]).filter(
    (group) => !excludedGroupIds.has(group.groupId)
  );

  return [
    ...(includePersonal ? [buildScopeOption({ type: 'personal' }, '个人云盘')] : []),
    ...groups.map((group) =>
      buildScopeOption({ type: 'group', groupId: group.groupId }, group.groupName || '未命名小组')
    ),
  ];
}

function DriveNavigator({
  rootId,
  scope,
  groupId,
  scopeMode = 'single',
  excludedGroupIds,
  renderableTypes = DEFAULT_RENDERABLE_TYPES,
  selectableTypes = DEFAULT_SELECTABLE_TYPES,
  resourcePreviewLimit = DEFAULT_RESOURCE_PREVIEW_LIMIT,
  disabled = false,
  disabledNodeIds,
  multiple = false,
  initialSelectedIds,
  refreshTrigger = 0,
  isNodeSelectable,
  isNodeDisabled,
  onChange,
  onNodeChange,
}: DriveNavigatorProps) {
  const driveService = useDriveService();
  const groupService = useGroupService();
  const singleScope = useMemo(
    () => resolveDriveScope(scope, groupId, rootId),
    [scope, groupId, rootId]
  );
  const finalRootId = singleScope.rootId;
  const finalGroupId = singleScope.groupId;
  const nodeMapRef = useRef<Map<string, DriveNode>>(new Map());
  const rootLabelRef = useRef<Map<string, string>>(new Map());
  const [treeData, setTreeData] = useState<DataNode[]>([]);
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const renderableTypeKey = [...renderableTypes].sort().join('\u0001');
  const selectableTypeKey = [...selectableTypes].sort().join('\u0001');
  const disabledNodeIdKey = [...(disabledNodeIds ?? [])].sort().join('\u0001');
  const excludedGroupIdKey = [...(excludedGroupIds ?? [])].sort().join('\u0001');
  const excludedGroupIdSet = useMemo(
    () => buildSetFromStableKey(excludedGroupIdKey),
    [excludedGroupIdKey]
  );

  const renderableTypeSet = useMemo(
    () => buildSetFromStableKey<DriveItemKind>(renderableTypeKey),
    [renderableTypeKey]
  );
  const selectableTypeSet = useMemo(
    () => buildSetFromStableKey<DriveItemKind>(selectableTypeKey),
    [selectableTypeKey]
  );
  const showsResources = renderableTypeSet.has('resource') || renderableTypeSet.has('link');
  const selectsResources = selectableTypeSet.has('resource') || selectableTypeSet.has('link');
  const effectiveResourceLimit =
    showsResources && !selectsResources ? resourcePreviewLimit : undefined;
  const disabledNodeIdSet = useMemo(
    () => buildSetFromStableKey(disabledNodeIdKey),
    [disabledNodeIdKey]
  );

  const getTreeKey = useCallback((node: DriveNode): string => {
    return buildTreeKey(buildScopeKey(node.scope), node.id);
  }, []);

  const renderTitle = useCallback((node: DriveNode) => {
    return <DriveNavigatorNodeTitle node={node} displayName={rootLabelRef.current.get(node.id)} />;
  }, []);

  const buildChildrenData = useCallback(
    (nodes: DriveNode[]): DataNode[] =>
      buildDriveTreeData(
        nodes,
        {
          renderableTypes: renderableTypeSet,
          selectableTypes: selectableTypeSet,
          disabledNodeIds: disabledNodeIdSet,
          getTreeKey,
          renderTitle,
          isNodeSelectable,
          isNodeDisabled,
        },
        nodeMapRef.current
      ),
    [
      disabledNodeIdSet,
      getTreeKey,
      isNodeDisabled,
      isNodeSelectable,
      renderTitle,
      renderableTypeSet,
      selectableTypeSet,
    ]
  );

  const loadChildrenForNode = useCallback(
    async (node: DriveNode): Promise<DriveNode[]> => {
      if (node.type !== 'root' && node.type !== 'folder') return [];
      try {
        return await driveService.listNodeChildren({
          nodeId: node.id,
          groupId: getDriveScopeGroupId(node.scope),
          resourceLimit: effectiveResourceLimit,
        });
      } catch (err) {
        toast.danger(parseErrorMessage(err));
        return [];
      }
    },
    [driveService, effectiveResourceLimit]
  );

  const resolveInputKey = useCallback((key: string): string | undefined => {
    if (nodeMapRef.current.has(key)) return key;
    for (const [treeKey, node] of nodeMapRef.current.entries()) {
      if (node.id === key) return treeKey;
    }
    return undefined;
  }, []);

  const normalizeSelectableKeys = useCallback(
    (keys: string[]) => {
      return keys
        .map((key) => resolveInputKey(key))
        .filter((key): key is string => {
          if (!key) return false;
          const node = nodeMapRef.current.get(key);
          return (
            node != null &&
            isDriveNodeSelectable(node, {
              selectableTypes: selectableTypeSet,
              disabledNodeIds: disabledNodeIdSet,
              isNodeSelectable,
              isNodeDisabled,
            })
          );
        });
    },
    [disabledNodeIdSet, isNodeDisabled, isNodeSelectable, resolveInputKey, selectableTypeSet]
  );

  const toNavigatorSelectionItem = useCallback((node: DriveNode): DriveSelectionItem | null => {
    const item = toDriveSelectionItem(node);
    if (!item) return null;
    const label = node.type === 'root' ? rootLabelRef.current.get(node.id) : undefined;
    return label ? { ...item, label } : item;
  }, []);

  const emitSelectionChange = useCallback(
    (keys: string[]) => {
      const selectedNodes = keys
        .map((key) => nodeMapRef.current.get(key))
        .filter(
          (node): node is DriveNode =>
            node != null &&
            isDriveNodeSelectable(node, {
              selectableTypes: selectableTypeSet,
              disabledNodeIds: disabledNodeIdSet,
              isNodeSelectable,
              isNodeDisabled,
            })
        );
      onNodeChange?.(selectedNodes);
      onChange?.(
        selectedNodes
          .map(toNavigatorSelectionItem)
          .filter((item): item is DriveSelectionItem => item != null)
      );
    },
    [
      disabledNodeIdSet,
      isNodeDisabled,
      isNodeSelectable,
      onChange,
      onNodeChange,
      selectableTypeSet,
      toNavigatorSelectionItem,
    ]
  );

  const loadRootNode = useCallback(
    async (option: DriveNavigatorScopeOption): Promise<DriveNode> => {
      const rootNode = await driveService.getRootNode({
        rootId: option.rootId,
        groupId: option.groupId,
      });
      rootLabelRef.current.set(rootNode.id, option.label);
      return rootNode;
    },
    [driveService]
  );

  const { loading } = useRequest(
    async (): Promise<DataNode[]> => {
      nodeMapRef.current.clear();
      rootLabelRef.current.clear();

      if (scopeMode === 'all' || scopeMode === 'groups') {
        const scopeOptions = await fetchAllScopeOptions(
          groupService,
          scopeMode === 'all',
          excludedGroupIdSet
        );
        const rootNodes = await Promise.all(scopeOptions.map(loadRootNode));
        return buildChildrenData(rootNodes);
      }

      const rootNode = await loadRootNode(
        buildSingleScopeOption(singleScope.scope, finalRootId, finalGroupId)
      );
      const baseRoot = buildChildrenData([rootNode])[0];
      if (!baseRoot) return [];
      if (rootNode.type !== 'root') return [baseRoot];

      const children = await loadChildrenForNode(rootNode);
      const childData = buildChildrenData(children);
      return [{ ...baseRoot, children: childData }];
    },
    {
      refreshDeps: [
        scopeMode,
        excludedGroupIdKey,
        finalRootId,
        finalGroupId,
        refreshTrigger,
        effectiveResourceLimit,
        renderableTypeKey,
        selectableTypeKey,
        disabledNodeIdKey,
        buildChildrenData,
        groupService,
        excludedGroupIdSet,
        isNodeSelectable,
        isNodeDisabled,
        loadChildrenForNode,
        loadRootNode,
      ],
      onSuccess: (data) => {
        setTreeData(data);
        const initialKeys = normalizeSelectableKeys(initialSelectedIds ?? []);
        const nextSelected = multiple ? initialKeys : initialKeys[0] ? [initialKeys[0]] : [];
        setSelectedKeys(nextSelected);
        emitSelectionChange(nextSelected);
      },
      onError: (err) => {
        setTreeData([]);
        setSelectedKeys([]);
        emitSelectionChange([]);
        toast.danger(parseErrorMessage(err));
      },
    }
  );

  const handleLoadData = async (treeNode: DataNode) => {
    if (disabled) return;
    const key = String(treeNode.key);
    const node = nodeMapRef.current.get(key);
    if (!node || (node.type !== 'root' && node.type !== 'folder')) return;
    const children = await loadChildrenForNode(node);
    const childData = buildChildrenData(children);
    setTreeData((prev) => replaceDriveTreeNodeChildren(prev, key, childData));
  };

  const handleSelect = useCallback(
    (keys: React.Key[], info: { node: DataNode; selected: boolean }) => {
      if (disabled) return;
      const clickedKey = String(info.node.key);
      if (multiple) {
        if (normalizeSelectableKeys([clickedKey]).length === 0) return;
        const normalized = normalizeSelectableKeys(keys.map(String));
        setSelectedKeys(normalized);
        emitSelectionChange(normalized);
        return;
      }

      const rawKeys = keys.map(String);
      const nextKeys = info.selected ? rawKeys : [clickedKey];
      const normalized = normalizeSelectableKeys(nextKeys);
      const next = normalized.length > 0 ? [normalized[0]!] : [];
      setSelectedKeys(next);
      emitSelectionChange(next);
    },
    [disabled, emitSelectionChange, multiple, normalizeSelectableKeys]
  );

  const defaultExpandedKeys =
    scopeMode === 'single' && treeData[0] ? [String(treeData[0].key)] : undefined;

  if (loading && treeData.length === 0) {
    return (
      <div className={styles.wrapper}>
        <div className={styles.stateBlock}>
          <Spin />
        </div>
      </div>
    );
  }

  if (!loading && treeData.length === 0) {
    return (
      <div className={styles.wrapper}>
        <div className={styles.stateBlock}>
          <Empty description="暂无内容" />
        </div>
      </div>
    );
  }

  return (
    <div className={styles.wrapper}>
      <Tree
        treeData={treeData}
        className={styles.tree}
        disabled={disabled}
        selectable
        multiple={multiple}
        selectedKeys={selectedKeys}
        defaultExpandedKeys={defaultExpandedKeys}
        expandAction="click"
        onSelect={handleSelect}
        loadData={handleLoadData}
      />
    </div>
  );
}

export default DriveNavigator;
