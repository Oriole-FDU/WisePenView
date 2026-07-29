import { replaceDriveTreeNodeChildren } from '@/components/Drive/common/buildDriveTreeData';
import { getDriveScopeGroupId } from '@/components/Drive/common/driveComponentModel';
import type { DataNode } from '@/components/Tree';
import { useDriveService } from '@/domains';
import type { DriveNode } from '@/domains/Drive';
import { useSidebarDriveExpansionStore } from '@/layouts/_common/Sidebar/DriveSidebar/_store/useSidebarDriveExpansionStore';
import { useWorkspaceNavigationStore } from '@/layouts/Workspace/_store/useWorkspaceNavigationStore';
import { parseErrorMessage } from '@/utils/error';
import { toast } from '@heroui/react';
import { useRequest } from 'ahooks';
import { useState } from 'react';
import { isSidebarResourceNode } from './sidebarDriveModel';

interface SidebarTreeLoadResult {
  treeData: DataNode[];
  nodeMap: Map<string, DriveNode>;
  expandedKeys: React.Key[];
  selectedKeys: React.Key[];
}

interface UseSidebarDriveTreeControllerOptions {
  buildTreeData: (nodes: DriveNode[], nodeMap: Map<string, DriveNode>) => DataNode[];
  onOpenResource: (node: Extract<DriveNode, { type: 'resource' | 'link' }>) => void;
}

export function useSidebarDriveTreeController({
  buildTreeData,
  onOpenResource,
}: UseSidebarDriveTreeControllerOptions) {
  const driveService = useDriveService();
  const navigationLocation = useWorkspaceNavigationStore((state) => state.location);
  const scope = navigationLocation.scope;
  const resourceLocation = navigationLocation.resource;
  const expansionScopeKey = scope.rootId;
  const groupId = getDriveScopeGroupId(scope);
  const [nodeMap, setNodeMap] = useState<Map<string, DriveNode>>(new Map());
  const [treeData, setTreeData] = useState<DataNode[]>([]);
  const [selectedKeys, setSelectedKeys] = useState<React.Key[]>([]);
  const [expandedKeys, setExpandedKeys] = useState<React.Key[]>([]);

  const { loading: treeLoading, refresh: refreshTree } = useRequest(
    async (): Promise<SidebarTreeLoadResult> => {
      const nextNodeMap = new Map<string, DriveNode>();
      const expandedNodeIds = new Set(
        useSidebarDriveExpansionStore.getState().expandedNodeIdsByScope[expansionScopeKey] ?? []
      );
      const rootNode = await driveService.getRootNode({ rootId: scope.rootId, groupId });
      const rootChildren = await driveService.listNodeChildren({ nodeId: rootNode.id, groupId });
      const baseRoot = buildTreeData([rootNode], nextNodeMap)[0];
      if (!baseRoot)
        return { treeData: [], nodeMap: nextNodeMap, expandedKeys: [], selectedKeys: [] };

      if (resourceLocation) {
        try {
          const pathNodes = await driveService.getNodePath({
            nodeId: resourceLocation.parentNodeId,
            groupId,
          });
          if (pathNodes.at(-1)?.id === resourceLocation.parentNodeId) {
            pathNodes.forEach((node) => {
              if (node.type === 'folder') expandedNodeIds.add(node.id);
            });
          }
        } catch {
          // 路径失效时保留已缓存的可用展开分支。
        }
      }

      const childrenByParent = new Map<string, DriveNode[]>([[rootNode.id, rootChildren]]);
      const loadExpandedChildren = async (nodes: DriveNode[]): Promise<void> => {
        await Promise.all(
          nodes.map(async (node) => {
            if (node.type !== 'folder' || !expandedNodeIds.has(node.id)) return;
            try {
              const children = await driveService.listNodeChildren({ nodeId: node.id, groupId });
              childrenByParent.set(node.id, children);
              await loadExpandedChildren(children);
            } catch {
              expandedNodeIds.delete(node.id);
            }
          })
        );
      };
      await loadExpandedChildren(rootChildren);

      const buildExpandedTree = (nodes: DriveNode[]): DataNode[] =>
        buildTreeData(nodes, nextNodeMap).map((treeNode) => {
          const children = childrenByParent.get(String(treeNode.key));
          return children ? { ...treeNode, children: buildExpandedTree(children) } : treeNode;
        });
      const parentChildren = resourceLocation
        ? (childrenByParent.get(resourceLocation.parentNodeId) ?? [])
        : [];
      const locatedNode = resourceLocation
        ? resourceLocation.nodeId
          ? parentChildren.find((node) => node.id === resourceLocation.nodeId)
          : parentChildren.find(
              (node) =>
                isSidebarResourceNode(node) && node.resourceId === resourceLocation.resourceId
            )
        : undefined;
      const selectedNodeId =
        resourceLocation &&
        isSidebarResourceNode(locatedNode) &&
        locatedNode.resourceId === resourceLocation.resourceId
          ? locatedNode.id
          : undefined;
      const availableExpandedNodeIds = [...expandedNodeIds].filter(
        (nodeId) => nextNodeMap.get(nodeId)?.type === 'folder'
      );
      return {
        treeData: [
          { ...baseRoot, children: undefined, isLeaf: true },
          ...buildExpandedTree(rootChildren),
        ],
        nodeMap: nextNodeMap,
        expandedKeys: availableExpandedNodeIds,
        selectedKeys: selectedNodeId ? [selectedNodeId] : [],
      };
    },
    {
      refreshDeps: [
        expansionScopeKey,
        scope.rootId,
        groupId,
        resourceLocation?.resourceId,
        resourceLocation?.parentNodeId,
        resourceLocation?.nodeId,
      ],
      onBefore: () => {
        setSelectedKeys([]);
        setExpandedKeys([]);
      },
      onSuccess: (result) => {
        setNodeMap(result.nodeMap);
        setTreeData(result.treeData);
        setExpandedKeys(result.expandedKeys);
        setSelectedKeys(result.selectedKeys);
        useSidebarDriveExpansionStore
          .getState()
          .setExpandedNodeIds(expansionScopeKey, result.expandedKeys.map(String));
      },
      onError: (error) => {
        setNodeMap(new Map());
        setTreeData([]);
        toast.danger(parseErrorMessage(error));
      },
    }
  );

  const handleLoadData = async (treeNode: DataNode): Promise<void> => {
    const key = String(treeNode.key);
    const node = nodeMap.get(key);
    if (!node || (node.type !== 'root' && node.type !== 'folder')) return;
    try {
      const children = await driveService.listNodeChildren({
        nodeId: node.id,
        groupId: getDriveScopeGroupId(node.scope),
      });
      const childNodeMap = new Map<string, DriveNode>();
      const childData = buildTreeData(children, childNodeMap);
      setNodeMap((currentNodeMap) => {
        const nextNodeMap = new Map(currentNodeMap);
        childNodeMap.forEach((childNode, childNodeId) => nextNodeMap.set(childNodeId, childNode));
        return nextNodeMap;
      });
      setTreeData((current) => replaceDriveTreeNodeChildren(current, node.id, childData));
    } catch (error) {
      toast.danger(parseErrorMessage(error));
    }
  };
  const handleSelect = (_keys: React.Key[], info: { node: DataNode }) => {
    const key = String(info.node.key);
    const node = nodeMap.get(key);
    if (!isSidebarResourceNode(node)) return;
    setSelectedKeys([key]);
    onOpenResource(node);
  };
  const handleExpand = (nextKeys: React.Key[]) => {
    setExpandedKeys(nextKeys);
    useSidebarDriveExpansionStore
      .getState()
      .setExpandedNodeIds(expansionScopeKey, nextKeys.map(String));
  };

  return {
    expandedKeys,
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
