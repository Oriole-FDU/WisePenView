import { toast } from '@heroui/react';
import type { TFunction } from 'i18next';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Empty, Spin } from '@/components/base/Feedback';
import type { DataNode } from '@/components/base/Tree';
import Tree from '@/components/base/Tree';
import { useDriveService, useGroupService } from '@/domains';
import { buildDriveNodeScope, type DriveNode, type DriveNodeScope } from '@/domains/Drive';
import type { IGroupService } from '@/domains/Group';
import { useApi } from '@/hooks/useApi';
import { parseErrorMessage } from '@/utils/error';

import {
  buildDriveTreeData,
  isDriveNodeSelectable,
  replaceDriveTreeNodeChildren,
} from '../common/buildDriveTreeData';
import {
  buildDriveLoadingNode,
  type DriveItemKind,
  type DriveScope,
  type DriveSelectionItem,
  type DriveViewNode,
  resolveDriveScope,
  toDriveSelectionItem,
} from '../common/driveComponentModel';
import { useDrivePagedTreeChildren } from '../common/useDrivePagedTreeChildren';
import DriveNavigatorNodeTitle from './DriveNavigatorNodeTitle';
import type { DriveNavigatorProps } from './index.type';
import styles from './style.module.less';

const DEFAULT_RENDERABLE_TYPES: DriveItemKind[] = ['root', 'folder', 'resource', 'link'];
const DEFAULT_SELECTABLE_TYPES: DriveItemKind[] = ['folder'];
const PERSONAL_SCOPE_KEY = 'personal';
const DEFAULT_RESOURCE_PREVIEW_LIMIT = 8;
const DEFAULT_SELECTABLE_RESOURCE_PAGE_SIZE = 50;
const GROUP_SCOPE_PAGE_SIZE = 20;
const GROUP_SCOPE_LOAD_MORE_NODE_ID = 'group-scope-load-more';
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
  t: TFunction<'drive'>,
  label?: string
): DriveNavigatorScopeOption {
  const resolved = resolveDriveScope(scope);
  const finalScope: DriveScope =
    resolved.scope.type === 'group'
      ? { type: 'group', groupId: resolved.scope.groupId }
      : { type: 'personal' };

  return {
    scopeKey: buildScopeKey(resolved.scope),
    label:
      label ??
      (resolved.scope.type === 'group' ? t('navigator.groupDrive') : t('navigator.personalDrive')),
    scope: finalScope,
    rootId: resolved.rootId,
    groupId: resolved.groupId,
  };
}

function buildSingleScopeOption(
  scope: DriveNodeScope,
  rootId: string,
  t: TFunction<'drive'>,
  groupId?: string
): DriveNavigatorScopeOption {
  const finalScope: DriveScope =
    scope.type === 'group' ? { type: 'group', groupId: scope.groupId } : { type: 'personal' };

  return {
    scopeKey: buildScopeKey(scope),
    label: scope.type === 'group' ? t('navigator.groupDrive') : t('navigator.personalDrive'),
    scope: finalScope,
    rootId,
    groupId,
  };
}

async function fetchScopeOptionsPage(
  groupService: IGroupService,
  page: number,
  includePersonal: boolean,
  excludedGroupIds: Set<string>,
  t: TFunction<'drive'>
): Promise<{ options: DriveNavigatorScopeOption[]; hasMore: boolean }> {
  const result = await groupService.fetchGroupList({
    groupRoleFilter: 'ALL',
    page,
    size: GROUP_SCOPE_PAGE_SIZE,
  });
  const groups = result.groups.filter((group) => !excludedGroupIds.has(group.groupId));

  return {
    options: [
      ...(includePersonal ? [buildScopeOption({ type: 'personal' }, t)] : []),
      ...groups.map((group) =>
        buildScopeOption(
          { type: 'group', groupId: group.groupId },
          t,
          group.groupName || t('navigator.unnamedGroup')
        )
      ),
    ],
    hasMore: result.hasMore,
  };
}

function DriveNavigator({
  rootId,
  scope,
  groupId,
  scopeMode = 'single',
  excludedGroupIds,
  resourceType,
  renderableTypes = DEFAULT_RENDERABLE_TYPES,
  selectableTypes = DEFAULT_SELECTABLE_TYPES,
  resourcePreviewLimit = DEFAULT_RESOURCE_PREVIEW_LIMIT,
  emptyText,
  disabled = false,
  dimUnselectableNodes = true,
  disabledNodeIds,
  multiple = false,
  initialSelectedIds,
  refreshTrigger = 0,
  isNodeSelectable,
  isNodeDisabled,
  onChange,
  onNodeChange,
}: DriveNavigatorProps) {
  const { t } = useTranslation('drive');
  const driveService = useDriveService();
  const groupService = useGroupService();
  const singleScope = resolveDriveScope(scope, groupId, rootId);
  const finalRootId = singleScope.rootId;
  const finalGroupId = singleScope.groupId;
  const finalScopeKey = buildScopeKey(singleScope.scope);
  const nodeMapRef = useRef<Map<string, DriveViewNode>>(new Map());
  const rootLabelRef = useRef<Map<string, string>>(new Map());
  const [treeData, setTreeData] = useState<DataNode[]>([]);
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const scopePageStateRef = useRef({ page: 0, hasMore: false, loading: false });
  const renderableTypeKey = [...renderableTypes].sort().join('\u0001');
  const selectableTypeKey = [...selectableTypes].sort().join('\u0001');
  const disabledNodeIdKey = [...(disabledNodeIds ?? [])].sort().join('\u0001');
  const excludedGroupIdKey = [...(excludedGroupIds ?? [])].sort().join('\u0001');
  const excludedGroupIdSet = buildSetFromStableKey(excludedGroupIdKey);

  const renderableTypeSet = buildSetFromStableKey<DriveItemKind>(renderableTypeKey);
  const selectableTypeSet = buildSetFromStableKey<DriveItemKind>(selectableTypeKey);
  const showsResources = renderableTypeSet.has('resource') || renderableTypeSet.has('link');
  const selectsResources = selectableTypeSet.has('resource') || selectableTypeSet.has('link');
  const effectiveResourceLimit =
    showsResources && !selectsResources ? resourcePreviewLimit : undefined;
  const navigatorResourcePageSize = effectiveResourceLimit ?? DEFAULT_SELECTABLE_RESOURCE_PAGE_SIZE;
  const disabledNodeIdSet = buildSetFromStableKey(disabledNodeIdKey);
  const { loadChildren, loadMoreChildren, reset } = useDrivePagedTreeChildren({
    pageSize: navigatorResourcePageSize,
    loadPage: async ({ parent, cursor, pageSize, refresh }) => {
      const result = await driveService.loadNodeChildren({
        parent,
        cursor,
        pageSize,
        kinds: showsResources ? ['folder', 'resource', 'link'] : ['folder'],
        resourceType,
        refresh,
      });
      return {
        nodes: [...result.folderNodes, ...result.resourceNodes],
        total: result.total,
        nextCursor: result.nextCursor,
      };
    },
    countLoaded: (children) =>
      children.filter((node) => node.type === 'resource' || node.type === 'link').length,
    buildLoadingPlaceholder: (parent, label) =>
      buildDriveLoadingNode(parent.id, parent.scope, label),
  });

  const getTreeKey = (node: DriveViewNode): string => {
    return buildTreeKey(buildScopeKey(node.scope), node.id);
  };

  const renderTitle = (node: DriveViewNode) => {
    const isScopeLoadMore =
      node.type === 'loading' && node.parentId === GROUP_SCOPE_LOAD_MORE_NODE_ID;
    return (
      <DriveNavigatorNodeTitle
        node={node}
        displayName={rootLabelRef.current.get(node.id)}
        onLoadMore={
          isScopeLoadMore
            ? () => void handleLoadMoreScopes()
            : node.type === 'loading'
              ? () => void handleLoadMoreChildren(node.parentId)
              : undefined
        }
      />
    );
  };

  const buildChildrenData = (nodes: DriveViewNode[]): DataNode[] =>
    buildDriveTreeData(
      nodes,
      {
        renderableTypes: renderableTypeSet,
        selectableTypes: selectableTypeSet,
        dimUnselectableNodes,
        interactiveLoadingNodes: true,
        disabledNodeIds: disabledNodeIdSet,
        getTreeKey,
        renderTitle,
        isNodeSelectable,
        isNodeDisabled,
      },
      nodeMapRef.current
    );

  async function handleLoadMoreChildren(parentNodeId: string): Promise<void> {
    const parent = [...nodeMapRef.current.values()].find(
      (node) => node.id === parentNodeId && (node.type === 'root' || node.type === 'folder')
    );
    if (!parent || (parent.type !== 'root' && parent.type !== 'folder')) return;
    const parentTreeKey = getTreeKey(parent);
    const nextChildren = await loadMoreChildren(parent);
    const childData = buildChildrenData(nextChildren);
    setTreeData((prev) => replaceDriveTreeNodeChildren(prev, parentTreeKey, childData));
    syncInitialSelectionForNodes(nextChildren);
  }

  const resolveInputKey = (key: string): string | undefined => {
    if (nodeMapRef.current.has(key)) return key;
    for (const [treeKey, node] of nodeMapRef.current.entries()) {
      if (node.id === key) return treeKey;
      if ((node.type === 'resource' || node.type === 'link') && node.resourceId === key) {
        return treeKey;
      }
    }
    return undefined;
  };

  const normalizeSelectableKeys = (keys: string[]) => {
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
  };

  const toNavigatorSelectionItem = (node: DriveNode): DriveSelectionItem | null => {
    const item = toDriveSelectionItem(node);
    if (!item) return null;
    const scopeLabel = rootLabelRef.current.get(node.scope.rootId);
    const label = node.type === 'root' ? scopeLabel : undefined;
    return {
      ...item,
      ...(label ? { label } : {}),
      ...(scopeLabel ? { scopeLabel } : {}),
    };
  };

  const emitSelectionChange = (keys: string[]) => {
    const selectedNodes = keys
      .map((key) => nodeMapRef.current.get(key))
      .filter(
        (node): node is DriveNode =>
          node != null &&
          node.type !== 'loading' &&
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
  };

  function syncInitialSelectionForNodes(nodes: DriveViewNode[]) {
    const initialIdSet = new Set(initialSelectedIds ?? []);
    if (initialIdSet.size === 0) return;
    const matchedKeys = normalizeSelectableKeys(
      nodes.flatMap((node) => {
        if (node.type === 'resource' || node.type === 'link') {
          return initialIdSet.has(node.resourceId) || initialIdSet.has(node.id)
            ? [node.resourceId, node.id]
            : [];
        }
        return initialIdSet.has(node.id) ? [node.id] : [];
      })
    );
    if (matchedKeys.length === 0) return;
    setSelectedKeys((current) => {
      const next = multiple
        ? [...current, ...matchedKeys.filter((key) => !current.includes(key))]
        : current.length > 0
          ? current
          : [matchedKeys[0]!];
      emitSelectionChange(next);
      return next;
    });
  }

  const loadRootNode = async (option: DriveNavigatorScopeOption): Promise<DriveNode> => {
    const rootNode = await driveService.getRoot({
      rootId: option.rootId,
      groupId: option.groupId,
    });
    rootLabelRef.current.set(rootNode.id, option.label);
    return rootNode;
  };

  const buildScopeLoadMoreNode = (): DriveViewNode =>
    buildDriveLoadingNode(
      GROUP_SCOPE_LOAD_MORE_NODE_ID,
      buildDriveNodeScope(),
      t('node.loadMoreGroups')
    );

  async function handleLoadMoreScopes(): Promise<void> {
    if (scopePageStateRef.current.loading || !scopePageStateRef.current.hasMore) return;
    scopePageStateRef.current.loading = true;
    const nextPage = scopePageStateRef.current.page + 1;
    try {
      const result = await fetchScopeOptionsPage(
        groupService,
        nextPage,
        false,
        excludedGroupIdSet,
        t
      );
      const rootNodes = await Promise.all(result.options.map(loadRootNode));
      scopePageStateRef.current = {
        page: nextPage,
        hasMore: result.hasMore,
        loading: false,
      };
      const nextData = buildChildrenData([
        ...rootNodes,
        ...(result.hasMore ? [buildScopeLoadMoreNode()] : []),
      ]);
      setTreeData((current) => [
        ...current.filter(
          (node) =>
            !String(node.key).includes(
              `${TREE_KEY_SEPARATOR}loading:${GROUP_SCOPE_LOAD_MORE_NODE_ID}`
            )
        ),
        ...nextData,
      ]);
    } catch (err) {
      scopePageStateRef.current.loading = false;
      toast.danger(parseErrorMessage(err));
    }
  }

  const { loading } = useApi(
    async (): Promise<DataNode[]> => {
      nodeMapRef.current.clear();
      rootLabelRef.current.clear();
      reset();

      if (scopeMode === 'all' || scopeMode === 'public') {
        const scopeResult = await fetchScopeOptionsPage(
          groupService,
          1,
          scopeMode === 'all',
          excludedGroupIdSet,
          t
        );
        scopePageStateRef.current = { page: 1, hasMore: scopeResult.hasMore, loading: false };
        const rootNodes = await Promise.all(scopeResult.options.map(loadRootNode));
        return buildChildrenData([
          ...rootNodes,
          ...(scopeResult.hasMore ? [buildScopeLoadMoreNode()] : []),
        ]);
      }

      const rootNode = await loadRootNode(
        buildSingleScopeOption(singleScope.scope, finalRootId, t, finalGroupId)
      );
      const baseRoot = buildChildrenData([rootNode])[0];
      if (!baseRoot) return [];
      if (rootNode.type !== 'root') return [baseRoot];

      const children = await loadChildren(rootNode);
      const childData = buildChildrenData(children);
      return [{ ...baseRoot, children: childData }];
    },
    {
      refreshDeps: [
        scopeMode,
        resourceType,
        excludedGroupIdKey,
        finalScopeKey,
        finalRootId,
        finalGroupId,
        refreshTrigger,
        navigatorResourcePageSize,
        showsResources,
        renderableTypeKey,
        selectableTypeKey,
        disabledNodeIdKey,
        dimUnselectableNodes,
      ],
      onSuccess: (data) => {
        setTreeData(data);
        const initialKeys = normalizeSelectableKeys(initialSelectedIds ?? []);
        const nextSelected = multiple ? initialKeys : initialKeys[0] ? [initialKeys[0]] : [];
        setSelectedKeys(nextSelected);
        emitSelectionChange(nextSelected);
      },
      onErrorEffect: () => {
        setTreeData([]);
        setSelectedKeys([]);
        emitSelectionChange([]);
      },
    }
  );

  const handleLoadData = async (treeNode: DataNode) => {
    if (disabled) return;
    const key = String(treeNode.key);
    const node = nodeMapRef.current.get(key);
    if (!node || (node.type !== 'root' && node.type !== 'folder')) return;
    const children = await loadChildren(node, { refresh: true });
    const childData = buildChildrenData(children);
    setTreeData((prev) => replaceDriveTreeNodeChildren(prev, key, childData));
    syncInitialSelectionForNodes(children);
  };

  const handleSelect = (keys: React.Key[], info: { node: DataNode; selected: boolean }) => {
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
  };

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
          <Empty description={emptyText ?? t('navigator.empty')} />
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
