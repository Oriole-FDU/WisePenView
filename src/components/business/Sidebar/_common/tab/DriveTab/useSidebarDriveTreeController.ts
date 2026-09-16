import { toast } from '@heroui/react';
import { type Key, useState } from 'react';

import type { DataNode } from '@/components/base/Tree';
import { replaceDriveTreeNodeChildren } from '@/components/business/Drive/common/buildDriveTreeData';
import {
  buildDriveLoadingNode,
  type DriveViewNode,
  getDriveScopeGroupId,
} from '@/components/business/Drive/common/driveComponentModel';
import { useDrivePagedTreeChildren } from '@/components/business/Drive/common/useDrivePagedTreeChildren';
import { useDriveService } from '@/domains';
import type { DriveNode, DriveNodeScope } from '@/domains/Drive';
import { useDriveRefreshStore } from '@/domains/Drive/store/useDriveRefreshStore';
import { useApi } from '@/hooks/useApi';
import { parseErrorMessage } from '@/utils/error';

import { useSidebarDriveExpansionStore } from './_store/useSidebarDriveExpansionStore';
import { isSidebarResourceNode } from './sidebarDriveModel';

const SIDEBAR_DRIVE_RESOURCE_PAGE_SIZE = 50;

interface SidebarTreeLoadResult {
  treeData: DataNode[];
  nodeMap: Map<string, DriveViewNode>;
  expandedKeys: Key[];
}

interface SidebarDriveTreeControls {
  handleCollapseAll: () => void;
  handleLoadMore: (parentNodeId: string) => void;
}

interface UseSidebarDriveTreeControllerOptions {
  scope: DriveNodeScope;
  rootDisplayName?: string;
  buildTreeData: (
    nodes: DriveViewNode[],
    nodeMap: Map<string, DriveViewNode>,
    controls: SidebarDriveTreeControls
  ) => DataNode[];
  onOpenResource: (node: Extract<DriveNode, { type: 'resource' | 'link' }>) => void;
}

export function useSidebarDriveTreeController({
  scope,
  rootDisplayName,
  buildTreeData,
  onOpenResource,
}: UseSidebarDriveTreeControllerOptions) {
  const driveService = useDriveService();
  const expansionScopeKey = scope.rootId;
  const groupId = getDriveScopeGroupId(scope);
  const refreshVersion = useDriveRefreshStore((state) => state.refreshVersion);
  const [nodeMap, setNodeMap] = useState<Map<string, DriveViewNode>>(new Map());
  const [treeData, setTreeData] = useState<DataNode[]>([]);
  const [selectedKeys, setSelectedKeys] = useState<Key[]>([]);
  const [expandedKeys, setExpandedKeys] = useState<Key[]>([]);
  const { loadChildren, loadMoreChildren, reset } = useDrivePagedTreeChildren({
    pageSize: SIDEBAR_DRIVE_RESOURCE_PAGE_SIZE,
    loadPage: async ({ parent, cursor, pageSize, refresh }) => {
      const result = await driveService.loadNodeChildren({
        parent,
        cursor,
        pageSize,
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
  const handleCollapseAll = () => {
    setExpandedKeys([]);
    useSidebarDriveExpansionStore.getState().setExpandedNodeIds(expansionScopeKey, []);
  };
  const treeControls = { handleCollapseAll, handleLoadMore };
  const replaceSidebarTreeChildren = (
    currentTreeData: DataNode[],
    parentNodeId: string,
    childData: DataNode[]
  ): DataNode[] => {
    if (parentNodeId === scope.rootId) {
      const [rootTreeNode] = currentTreeData;
      return rootTreeNode ? [rootTreeNode, ...childData] : childData;
    }
    return replaceDriveTreeNodeChildren(currentTreeData, parentNodeId, childData);
  };

  const { loading: treeLoading, refresh: refreshTree } = useApi(
    async (): Promise<SidebarTreeLoadResult> => {
      const nextNodeMap = new Map<string, DriveViewNode>();
      const expandedNodeIds = new Set(
        useSidebarDriveExpansionStore.getState().expandedNodeIdsByScope[expansionScopeKey] ?? []
      );
      const rootNode = await driveService.getRoot({ rootId: scope.rootId, groupId });
      const rootChildren = await loadChildren(rootNode, { refresh: true });
      const baseRoot = buildTreeData([rootNode], nextNodeMap, treeControls)[0];
      if (!baseRoot) {
        return {
          treeData: [],
          nodeMap: nextNodeMap,
          expandedKeys: [],
        };
      }

      const childrenByParent = new Map<string, DriveViewNode[]>([[rootNode.id, rootChildren]]);
      const loadExpandedChildren = async (nodes: DriveViewNode[]): Promise<void> => {
        await Promise.all(
          nodes.map(async (node) => {
            if (node.type !== 'folder' || !expandedNodeIds.has(node.id)) return;
            try {
              const children = await loadChildren(node, { refresh: true });
              childrenByParent.set(node.id, children);
              await loadExpandedChildren(children.filter((child) => child.type === 'folder'));
            } catch {
              expandedNodeIds.delete(node.id);
            }
          })
        );
      };
      await loadExpandedChildren(rootChildren);

      const buildExpandedTree = (nodes: DriveViewNode[]): DataNode[] =>
        buildTreeData(nodes, nextNodeMap, treeControls).map((treeNode) => {
          const children = childrenByParent.get(String(treeNode.key));
          return children ? { ...treeNode, children: buildExpandedTree(children) } : treeNode;
        });
      const expandedTreeChildren = buildExpandedTree(rootChildren);
      const availableExpandedNodeIds = [...expandedNodeIds].filter(
        (nodeId) => nextNodeMap.get(nodeId)?.type === 'folder'
      );
      return {
        treeData: [{ ...baseRoot, children: undefined, isLeaf: true }, ...expandedTreeChildren],
        nodeMap: nextNodeMap,
        expandedKeys: availableExpandedNodeIds,
      };
    },
    {
      refreshDeps: [expansionScopeKey, scope.rootId, groupId, rootDisplayName, refreshVersion],
      onSuccess: (result) => {
        setNodeMap(result.nodeMap);
        setTreeData(result.treeData);
        setExpandedKeys(result.expandedKeys);
        setSelectedKeys([]);
        useSidebarDriveExpansionStore
          .getState()
          .setExpandedNodeIds(expansionScopeKey, result.expandedKeys.map(String));
      },
      onErrorEffect: () => {
        setNodeMap(new Map());
        setTreeData([]);
        reset();
      },
    }
  );

  const handleLoadData = async (treeNode: DataNode): Promise<void> => {
    const key = String(treeNode.key);
    const node = nodeMap.get(key);
    if (!node || (node.type !== 'root' && node.type !== 'folder')) return;
    try {
      const children = await loadChildren(node, { refresh: true });
      const childNodeMap = new Map<string, DriveViewNode>();
      const childData = buildTreeData(children, childNodeMap, treeControls);
      setNodeMap((currentNodeMap) => {
        const nextNodeMap = new Map(currentNodeMap);
        childNodeMap.forEach((childNode, childNodeId) => nextNodeMap.set(childNodeId, childNode));
        return nextNodeMap;
      });
      setTreeData((current) => replaceSidebarTreeChildren(current, node.id, childData));
    } catch (error) {
      toast.danger(parseErrorMessage(error));
    }
  };
  async function handleLoadMore(parentNodeId: string): Promise<void> {
    const parentNode = nodeMap.get(parentNodeId);
    if (!parentNode || (parentNode.type !== 'root' && parentNode.type !== 'folder')) return;

    try {
      const nextChildren = await loadMoreChildren(parentNode);
      const childNodeMap = new Map<string, DriveViewNode>();
      const childData = buildTreeData(nextChildren, childNodeMap, treeControls);
      setNodeMap((currentNodeMap) => {
        const nextNodeMap = new Map(currentNodeMap);
        childNodeMap.forEach((childNode, childNodeId) => nextNodeMap.set(childNodeId, childNode));
        return nextNodeMap;
      });
      setTreeData((current) => replaceSidebarTreeChildren(current, parentNode.id, childData));
    } catch (error) {
      toast.danger(parseErrorMessage(error));
    }
  }
  const handleSelect = (_keys: Key[], info: { node: DataNode }) => {
    const key = String(info.node.key);
    const node = nodeMap.get(key);
    if (!isSidebarResourceNode(node)) return;
    setSelectedKeys([key]);
    onOpenResource(node);
  };
  const handleExpand = (nextKeys: Key[], info: { node: DataNode; expanded: boolean }) => {
    setExpandedKeys(nextKeys);
    useSidebarDriveExpansionStore
      .getState()
      .setExpandedNodeIds(expansionScopeKey, nextKeys.map(String));
    if (info.expanded && info.node.children === undefined) {
      void handleLoadData(info.node);
    }
  };
  return {
    expandedKeys,
    handleCollapseAll,
    handleExpand,
    handleLoadData,
    handleSelect,
    nodeMap,
    refreshTree,
    selectedKeys,
    treeData,
    treeLoading,
  };
}
