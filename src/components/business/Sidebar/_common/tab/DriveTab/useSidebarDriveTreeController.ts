import { type Key } from 'react';
import { useTranslation } from 'react-i18next';

import type { DataNode } from '@/components/base/Tree';
import {
  buildDriveLoadingNode,
  type DriveViewNode,
} from '@/components/business/Drive/common/driveComponentModel';
import type { DriveContainerNode, DriveNodeScope } from '@/domains/Drive';
import { DRIVE_TREE_MODE, DRIVE_TREE_SURFACE, useDriveTree } from '@/runtime/drive';
import { notifyError } from '@/utils/error';

import { isSidebarResourceNode } from './sidebarDriveModel';

const SIDEBAR_DRIVE_RESOURCE_PAGE_SIZE = 50;

interface SidebarDriveTreeControls {
  handleCollapseAll: () => void;
  handleLoadMore: (parentNodeId: string) => void;
}

interface UseSidebarDriveTreeControllerOptions {
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

export function useSidebarDriveTreeController({
  scope,
  buildTreeData,
  onOpenResource,
}: UseSidebarDriveTreeControllerOptions) {
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
  const nodeMap = new Map(snapshot.nodeById);

  const handleLoadMore = (parentNodeId: string): void => {
    void runtime.loadMore(parentNodeId).catch((error: unknown) => {
      notifyError(error);
    });
  };
  const treeControls: SidebarDriveTreeControls = {
    handleCollapseAll: () => runtime.collapseAll(),
    handleLoadMore,
  };

  const getChildren = (node: DriveContainerNode): DriveViewNode[] => {
    const children = [...(snapshot.childrenByParent.get(node.id) ?? [])];
    const page = snapshot.pageByParent.get(node.id);
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
    const children = snapshot.childrenByParent.get(node.id);
    if (!children) return treeNode;
    return {
      ...treeNode,
      children: getChildren(node).map((child) => buildNode(child, controls)),
    };
  };

  const treeControlsForRender = treeControls;
  const root = snapshot.root;
  const treeData =
    root == null
      ? []
      : [
          {
            ...buildNode(root, treeControlsForRender),
            children: undefined,
            isLeaf: true,
          },
          ...(snapshot.childrenByParent.get(root.id) ?? []).map((node) =>
            buildNode(node, treeControlsForRender)
          ),
        ];
  const expandedKeys = [...snapshot.expandedNodeIds].filter((nodeId) =>
    isContainer(snapshot.nodeById.get(nodeId))
  );
  const selectedKeys = [...snapshot.selectedNodeIds];

  const handleLoadData = async (treeNode: DataNode): Promise<void> => {
    const node = snapshot.nodeById.get(String(treeNode.key));
    if (!isContainer(node)) return;
    try {
      await runtime.loadChildren(node);
      await runtime.expandNode(node.id);
    } catch (error) {
      notifyError(error);
    }
  };

  const handleSelect = (_keys: Key[], info: { node: DataNode }) => {
    const key = String(info.node.key);
    const node = nodeMap.get(key);
    if (!isSidebarResourceNode(node)) return;
    runtime.selectNode(key);
    onOpenResource(node);
  };

  const handleExpand = (nextKeys: Key[], info: { node: DataNode; expanded: boolean }) => {
    runtime.setExpandedNodeIds(nextKeys.map(String));
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
