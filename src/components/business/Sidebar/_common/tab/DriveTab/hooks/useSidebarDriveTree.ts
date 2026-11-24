import { type Key } from 'react';
import { useTranslation } from 'react-i18next';

import type { DataNode } from '@/components/base/Tree';
import {
  buildDriveLoadingNode,
  type DriveViewNode,
} from '@/components/business/Drive/common/driveComponentModel';
import type { DriveContainerNode, DriveNodeScope } from '@/domains/Drive';
import {
  buildDriveNodeKey,
  DRIVE_TREE_MODE,
  DRIVE_TREE_SURFACE,
  useDriveTree,
} from '@/runtime/drive';
import { notifyError } from '@/utils/error';

import { isSidebarResourceNode } from '../sidebarDriveModel';

const SIDEBAR_DRIVE_RESOURCE_PAGE_SIZE = 50;

interface SidebarDriveTreeControls {
  handleCollapseAll: () => void;
  handleLoadMore: (parentNodeId: string) => void;
}

interface UseSidebarDriveTreeOptions {
  scope: DriveNodeScope;
  buildTreeData: (
    nodes: DriveViewNode[],
    nodeMap: Map<string, DriveViewNode>,
    controls: SidebarDriveTreeControls
  ) => DataNode[];
  onOpenResource: (node: Extract<DriveViewNode, { type: 'resource' | 'link' }>) => void;
}

const isContainer = (node: DriveViewNode | undefined): node is DriveContainerNode =>
  node?.type === 'root' || node?.type === 'folder';

export function useSidebarDriveTree({
  scope,
  buildTreeData,
  onOpenResource,
}: UseSidebarDriveTreeOptions) {
  const { t } = useTranslation('drive');
  const { runtime, snapshot } = useDriveTree(
    {
      scope,
      surface: DRIVE_TREE_SURFACE.sidebar,
      mode: DRIVE_TREE_MODE.browse,
      load: { pageSize: SIDEBAR_DRIVE_RESOURCE_PAGE_SIZE },
    },
    {
      onError: (error) => notifyError(error),
    }
  );
  const nodeMap = new Map(
    [...snapshot.nodeByKey.entries()]
      .filter(([, node]) => node.scope.rootId === scope.rootId)
      .map(([, node]): [string, DriveViewNode] => [node.id, node])
  );

  const handleLoadMore = (parentNodeId: string): void => {
    void runtime.loadMore(buildDriveNodeKey(scope, parentNodeId)).catch((error: unknown) => {
      notifyError(error);
    });
  };
  const treeControls: SidebarDriveTreeControls = {
    handleCollapseAll: () => runtime.collapseAll(),
    handleLoadMore,
  };

  const getChildren = (node: DriveContainerNode): DriveViewNode[] => {
    const nodeKey = buildDriveNodeKey(node.scope, node.id);
    const children = [...(snapshot.childrenByKey.get(nodeKey) ?? [])];
    const page = snapshot.pageByKey.get(nodeKey);
    if (!page?.hasMore) return children;
    const loaded = children.filter(
      (child) => child.type === 'resource' || child.type === 'link'
    ).length;
    return [
      ...children,
      buildDriveLoadingNode(
        node.id,
        node.scope,
        t('node.loadMoreProgress', { loaded, total: page.total })
      ),
    ];
  };

  const buildNode = (node: DriveViewNode, controls: SidebarDriveTreeControls): DataNode => {
    const [treeNode] = buildTreeData([node], nodeMap, controls);
    if (!treeNode || !isContainer(node)) return treeNode;
    const children = snapshot.childrenByKey.get(buildDriveNodeKey(node.scope, node.id));
    if (!children) return treeNode;
    return {
      ...treeNode,
      children: getChildren(node).map((child) => buildNode(child, controls)),
    };
  };

  const treeControlsForRender = treeControls;
  const root = snapshot.nodeByKey.get(snapshot.primaryRootKey);
  const treeData =
    root?.type !== 'root'
      ? []
      : [
          {
            ...buildNode(root, treeControlsForRender),
            children: undefined,
            isLeaf: true,
          },
          ...(snapshot.childrenByKey.get(snapshot.primaryRootKey) ?? []).map((node) =>
            buildNode(node, treeControlsForRender)
          ),
        ];
  const expandedKeys = [...snapshot.expandedKeys]
    .map((nodeKey) => snapshot.nodeByKey.get(nodeKey))
    .filter(
      (node): node is NonNullable<typeof node> =>
        isContainer(node) && node.scope.rootId === scope.rootId
    )
    .map((node) => node.id);
  const selectedKeys = [...snapshot.selectedKeys]
    .map((nodeKey) => snapshot.nodeByKey.get(nodeKey))
    .filter((node): node is NonNullable<typeof node> => node?.scope.rootId === scope.rootId)
    .map((node) => node.id);

  const handleLoadData = async (treeNode: DataNode): Promise<void> => {
    const node = nodeMap.get(String(treeNode.key));
    if (!isContainer(node)) return;
    try {
      await runtime.expandNode(buildDriveNodeKey(node.scope, node.id));
    } catch (error) {
      notifyError(error);
    }
  };

  const handleSelect = (_keys: Key[], info: { node: DataNode }) => {
    const key = String(info.node.key);
    const node = nodeMap.get(key);
    if (!isSidebarResourceNode(node)) return;
    runtime.selectNode(buildDriveNodeKey(node.scope, node.id));
    onOpenResource(node);
  };

  const handleExpand = (nextKeys: Key[], info: { node: DataNode; expanded: boolean }) => {
    runtime.setExpandedKeys(nextKeys.map((key) => buildDriveNodeKey(scope, String(key))));
    if (info.expanded && info.node.children === undefined) {
      void handleLoadData(info.node);
    }
  };

  return {
    expandedKeys,
    handleCollapseAll: () => runtime.collapseAll(),
    handleExpand,
    handleLoadData,
    handleSelect,
    nodeMap,
    selectedKeys,
    treeData,
    treeLoading: !snapshot.initialized || snapshot.loading,
  };
}
