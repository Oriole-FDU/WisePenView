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
  buildDriveNavigatorTreeKey,
  type DriveNavigatorRequest,
  type DriveTreeSnapshot,
  useDriveNavigator,
} from '@/runtime/drive';
import { notifyError } from '@/utils/error';

import { buildDriveTreeData } from '../common/buildDriveTreeData';
import DriveNavigatorNodeTitle from './DriveNavigatorNodeTitle';
import type { DriveNavigatorProps } from './index.type';
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
  const request: DriveNavigatorRequest = {
    scope: resolvedScope.scope,
    scopeMode,
    excludedGroupIds,
    resourceType,
    renderableTypes,
    selectableTypes,
    showResources: showsResources,
    pageSize: resourcePageSize,
    multiple,
    initialSelectedIds,
    disabledNodeIds,
    refreshTrigger,
  };
  const { runtime, snapshot } = useDriveNavigator(request, {
    onError: (error) => notifyError(error),
  });
  const nodeByTreeKey = new Map(
    [...snapshot.nodeByTreeKey.entries()].filter(([, node]) => renderableTypes.includes(node.type))
  );
  const rootLabelByRootId = new Map(
    snapshot.scopeEntries.map((entry) => [
      entry.scope.rootId,
      entry.groupName ??
        (entry.scope.type === 'group' ? t('navigator.groupDrive') : t('navigator.personalDrive')),
    ])
  );

  const getTreeSnapshot = (node: DriveNode): DriveTreeSnapshot | undefined =>
    snapshot.treeSnapshots.get(node.scope.rootId);

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
                  const treeKey = buildDriveNavigatorTreeKey(node.scope, node.parentId);
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
        getTreeKey: (node) => buildDriveNavigatorTreeKey(node.scope, node.id),
        renderTitle,
        isNodeSelectable,
        isNodeDisabled,
      },
      nodeByTreeKey
    );

  const appendPageLoadMore = (parent: DriveViewNode, tree: DriveTreeSnapshot) => {
    if (!isContainer(parent)) return [];
    const page = tree.pageByParent.get(parent.id);
    if (!page?.hasMore) return [];
    const loaded =
      tree.childrenByParent
        .get(parent.id)
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
    const tree = getTreeSnapshot(node);
    if (!tree) return treeNode;
    const children = tree?.childrenByParent.get(node.id);
    if (!children) return treeNode;
    return {
      ...treeNode,
      children: buildNodes([...children, ...appendPageLoadMore(node, tree)]).map((child) => {
        const childNode = snapshot.nodeByTreeKey.get(String(child.key));
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
      await runtime.loadChildren(key);
      runtime.setExpandedKeys([...snapshot.expandedTreeKeys, key]);
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
        selectedKeys={[...snapshot.selectedTreeKeys]}
        expandedKeys={[...snapshot.expandedTreeKeys]}
        expandAction="click"
        onSelect={handleSelect}
        onExpand={handleExpand}
        loadData={handleLoadData}
      />
    </div>
  );
}

export default DriveNavigator;
