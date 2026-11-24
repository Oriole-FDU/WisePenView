import { type Key } from 'react';
import { useTranslation } from 'react-i18next';

import { EmptyState, Spin } from '@/components/base/Feedback';
import type { DataNode } from '@/components/base/Tree';
import Tree from '@/components/base/Tree';
import type {
  DriveItemKind,
  DriveSelectionItem,
  DriveViewNode,
} from '@/components/business/Drive/common/driveComponentModel';
import {
  buildDriveLoadingNode,
  resolveDriveScope,
  toDriveSelectionItem,
} from '@/components/business/Drive/common/driveComponentModel';
import type { DriveNode } from '@/domains/Drive';
import {
  buildDriveNodeKey,
  DRIVE_TREE_MODE,
  DRIVE_TREE_SURFACE,
  type DriveTreeRequest,
} from '@/runtime/drive';
import { notifyError } from '@/utils/error';

import { buildDriveTreeData } from '../common/buildDriveTreeData';
import { useNavigatorDriveTree } from './hooks/useNavigatorDriveTree';
import type { DriveNavigatorProps } from './index.type';
import DriveNavigatorNodeTitle from './parts/DriveNavigatorNodeTitle';
import styles from './style.module.scss';

const DEFAULT_RENDERABLE_TYPES: DriveItemKind[] = ['root', 'folder', 'resource', 'link'];
const DEFAULT_SELECTABLE_TYPES: DriveItemKind[] = ['folder'];
const DEFAULT_RESOURCE_PREVIEW_LIMIT = 8;
const DEFAULT_SELECTABLE_RESOURCE_PAGE_SIZE = 50;
const GROUP_SCOPE_LOAD_MORE_NODE_ID = 'group-scope-load-more';

const isContainer = (node: DriveViewNode): boolean =>
  node.type === 'root' || node.type === 'folder';

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
  const resolvedScope = resolveDriveScope(scope, groupId, rootId);
  const showsResources = renderableTypes.includes('resource') || renderableTypes.includes('link');
  const selectsResources = selectableTypes.includes('resource') || selectableTypes.includes('link');
  const effectiveResourceLimit =
    showsResources && !selectsResources ? resourcePreviewLimit : undefined;
  const resourcePageSize = effectiveResourceLimit ?? DEFAULT_SELECTABLE_RESOURCE_PAGE_SIZE;
  const request: DriveTreeRequest = {
    scope: resolvedScope.scope,
    surface: DRIVE_TREE_SURFACE.navigator,
    mode: DRIVE_TREE_MODE.select,
    scopeMode,
    excludedGroupIds,
    load: {
      resourceType,
      pageSize: resourcePageSize,
      kinds: showsResources ? ['folder', 'resource', 'link'] : ['folder'],
    },
    selectableTypes,
    multiple,
    initialSelectedIds,
    disabledNodeIds,
    refreshTrigger,
  };
  const { runtime, snapshot } = useNavigatorDriveTree(request, {
    onError: (error) => notifyError(error),
  });
  const nodeByKey = new Map(
    [...snapshot.nodeByKey.entries()].filter(([, node]) => renderableTypes.includes(node.type))
  );
  const rootLabelByRootId = new Map(
    snapshot.scopeEntries.map((entry) => [
      entry.scope.rootId,
      entry.groupName ??
        (entry.scope.type === 'group' ? t('navigator.groupDrive') : t('navigator.personalDrive')),
    ])
  );

  const renderTitle = (node: DriveViewNode) => {
    const isScopeLoadMore =
      node.type === 'loading' && node.parentId === GROUP_SCOPE_LOAD_MORE_NODE_ID;
    return (
      <DriveNavigatorNodeTitle
        node={node}
        displayName={node.type === 'root' ? rootLabelByRootId.get(node.scope.rootId) : undefined}
        onLoadMore={
          isScopeLoadMore
            ? () => {
                void runtime.loadMoreScopes().catch((error: unknown) => {
                  notifyError(error);
                });
              }
            : node.type === 'loading'
              ? () => {
                  const treeKey = buildDriveNodeKey(node.scope, node.parentId);
                  void runtime.loadMore(treeKey).catch((error: unknown) => {
                    notifyError(error);
                  });
                }
              : undefined
        }
      />
    );
  };

  const buildNodes = (nodes: DriveViewNode[]): DataNode[] =>
    buildDriveTreeData(
      nodes,
      {
        renderableTypes: new Set(renderableTypes),
        selectableTypes: new Set(selectableTypes),
        dimUnselectableNodes,
        interactiveLoadingNodes: true,
        disabledNodeIds: new Set(disabledNodeIds),
        getTreeKey: (node) => buildDriveNodeKey(node.scope, node.id),
        renderTitle,
        isNodeSelectable,
        isNodeDisabled,
      },
      nodeByKey
    );

  const appendPageLoadMore = (parent: DriveViewNode) => {
    if (!isContainer(parent)) return [];
    const parentKey = buildDriveNodeKey(parent.scope, parent.id);
    const page = snapshot.pageByKey.get(parentKey);
    if (!page?.hasMore) return [];
    const loaded =
      snapshot.childrenByKey
        .get(parentKey)
        ?.filter((node) => node.type === 'resource' || node.type === 'link').length ?? 0;
    return [
      buildDriveLoadingNode(
        parent.id,
        parent.scope,
        t('node.loadMoreProgress', { loaded, total: page.total })
      ),
    ];
  };

  const buildTreeNode = (node: DriveViewNode): DataNode => {
    const [treeNode] = buildNodes([node]);
    if (!treeNode || node.type === 'loading') return treeNode;
    const children = snapshot.childrenByKey.get(buildDriveNodeKey(node.scope, node.id));
    if (!children) return treeNode;
    return {
      ...treeNode,
      children: buildNodes([...children, ...appendPageLoadMore(node)]).map((child) => {
        const childNode = snapshot.nodeByKey.get(String(child.key));
        return childNode ? buildTreeNode(childNode) : child;
      }),
    };
  };

  const scopeLoadMoreNode = snapshot.hasMoreScopes
    ? buildDriveLoadingNode(
        GROUP_SCOPE_LOAD_MORE_NODE_ID,
        resolvedScope.scope,
        t('node.loadMoreGroups')
      )
    : undefined;
  const treeData = [
    ...snapshot.scopeEntries
      .map((entry) => entry.root)
      .filter((root): root is NonNullable<typeof root> => Boolean(root))
      .map(buildTreeNode),
    ...(scopeLoadMoreNode ? buildNodes([scopeLoadMoreNode]) : []),
  ];

  const toSelectionItem = (node: DriveNode): DriveSelectionItem | null => {
    const item = toDriveSelectionItem(node);
    if (!item) return null;
    const scopeLabel = rootLabelByRootId.get(node.scope.rootId);
    return {
      ...item,
      ...(node.type === 'root' && scopeLabel ? { label: scopeLabel } : {}),
      ...(scopeLabel ? { scopeLabel } : {}),
    };
  };
  const emitSelectionChange = (selected: DriveNode[]) => {
    onNodeChange?.(selected);
    onChange?.(
      selected.map(toSelectionItem).filter((item): item is DriveSelectionItem => item != null)
    );
  };

  const handleLoadData = async (treeNode: DataNode): Promise<void> => {
    const key = String(treeNode.key);
    try {
      await runtime.expandNode(key);
    } catch (error) {
      notifyError(error);
    }
  };

  const handleSelect = (keys: Key[], info: { node: DataNode; selected: boolean }) => {
    const selected = runtime.select({
      keys: keys.map(String),
      clickedKey: String(info.node.key),
      clickedSelected: info.selected,
      isNodeSelectable,
      isNodeDisabled,
    });
    emitSelectionChange(selected);
  };

  const handleExpand = (nextKeys: Key[], info: { node: DataNode; expanded: boolean }) => {
    runtime.setExpandedKeys(nextKeys.map(String));
    if (info.expanded && info.node.children === undefined) {
      void handleLoadData(info.node);
    }
  };

  if (snapshot.loading && !snapshot.initialized) {
    return (
      <div className={styles.wrapper}>
        <div className={styles.stateBlock}>
          <Spin />
        </div>
      </div>
    );
  }

  if (!snapshot.loading && treeData.length === 0) {
    return (
      <div className={styles.wrapper}>
        <div className={styles.stateBlock}>
          <EmptyState title={emptyText ?? t('navigator.empty')} size="compact" />
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
        selectedKeys={[...snapshot.selectedKeys]}
        expandedKeys={[...snapshot.expandedKeys]}
        expandAction="click"
        onSelect={handleSelect}
        onExpand={handleExpand}
        loadData={handleLoadData}
      />
    </div>
  );
}

export default DriveNavigator;
