import { Empty, Spin } from '@/components/Feedback';
import type { DataNode } from '@/components/Tree';
import Tree from '@/components/Tree';
import { useDriveService, useGroupService } from '@/domains';
import type { DriveNode, DriveNodeScope } from '@/domains/Drive';
import type { IGroupService } from '@/domains/Group';
import { parseErrorMessage } from '@/utils/error';
import { toast } from '@heroui/react';
import { useRequest } from 'ahooks';
import type { TFunction } from 'i18next';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
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

async function fetchAllScopeOptions(
  groupService: IGroupService,
  includePersonal: boolean,
  excludedGroupIds: Set<string>,
  t: TFunction<'drive'>
): Promise<DriveNavigatorScopeOption[]> {
  const groups = (await groupService.fetchAllMyGroups()).filter(
    (group) => !excludedGroupIds.has(group.groupId)
  );

  return [
    ...(includePersonal ? [buildScopeOption({ type: 'personal' }, t)] : []),
    ...groups.map((group) =>
      buildScopeOption(
        { type: 'group', groupId: group.groupId },
        t,
        group.groupName || t('navigator.unnamedGroup')
      )
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
  const { t } = useTranslation('drive');
  const driveService = useDriveService();
  const groupService = useGroupService();
  const singleScope = resolveDriveScope(scope, groupId, rootId);
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
  const excludedGroupIdSet = buildSetFromStableKey(excludedGroupIdKey);

  const renderableTypeSet = buildSetFromStableKey<DriveItemKind>(renderableTypeKey);
  const selectableTypeSet = buildSetFromStableKey<DriveItemKind>(selectableTypeKey);
  const showsResources = renderableTypeSet.has('resource') || renderableTypeSet.has('link');
  const selectsResources = selectableTypeSet.has('resource') || selectableTypeSet.has('link');
  const effectiveResourceLimit =
    showsResources && !selectsResources ? resourcePreviewLimit : undefined;
  const disabledNodeIdSet = buildSetFromStableKey(disabledNodeIdKey);

  const getTreeKey = (node: DriveNode): string => {
    return buildTreeKey(buildScopeKey(node.scope), node.id);
  };

  const renderTitle = (node: DriveNode) => {
    return <DriveNavigatorNodeTitle node={node} displayName={rootLabelRef.current.get(node.id)} />;
  };

  const buildChildrenData = (nodes: DriveNode[]): DataNode[] =>
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
    );

  const loadChildrenForNode = async (node: DriveNode): Promise<DriveNode[]> => {
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
  };

  const resolveInputKey = (key: string): string | undefined => {
    if (nodeMapRef.current.has(key)) return key;
    for (const [treeKey, node] of nodeMapRef.current.entries()) {
      if (node.id === key) return treeKey;
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
    const label = node.type === 'root' ? rootLabelRef.current.get(node.id) : undefined;
    return label ? { ...item, label } : item;
  };

  const emitSelectionChange = (keys: string[]) => {
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
  };

  const loadRootNode = async (option: DriveNavigatorScopeOption): Promise<DriveNode> => {
    const rootNode = await driveService.getRootNode({
      rootId: option.rootId,
      groupId: option.groupId,
    });
    rootLabelRef.current.set(rootNode.id, option.label);
    return rootNode;
  };

  const { loading } = useRequest(
    async (): Promise<DataNode[]> => {
      nodeMapRef.current.clear();
      rootLabelRef.current.clear();

      if (scopeMode === 'all' || scopeMode === 'groups') {
        const scopeOptions = await fetchAllScopeOptions(
          groupService,
          scopeMode === 'all',
          excludedGroupIdSet,
          t
        );
        const rootNodes = await Promise.all(scopeOptions.map(loadRootNode));
        return buildChildrenData(rootNodes);
      }

      const rootNode = await loadRootNode(
        buildSingleScopeOption(singleScope.scope, finalRootId, t, finalGroupId)
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
        t,
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
          <Empty description={t('navigator.empty')} />
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
