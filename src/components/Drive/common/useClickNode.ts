import type { DriveNode } from '@/domains/Drive';
import { useOpenInWorkspace } from '@/hooks/useOpenInWorkspace';
import type { ResourceViewer } from '@/utils/navigation/resourceTarget';

export interface UseClickNodeParams {
  /** 进入 root / folder 等容器型节点（通常由 useTableDrive.enterFolder 提供） */
  enterFolder: (nodeId: string) => void;
}

/**
 * DriveNode 点击行为的统一入口，按 node.type 路由：
 * - root / folder：容器型节点，进入下一层
 * - resource / link：交由 navigateResource 处理跳转与 scope 写入
 */
export const useClickNode = ({ enterFolder }: UseClickNodeParams) => {
  const openInWorkspace = useOpenInWorkspace();

  return (node: DriveNode, viewer?: ResourceViewer) => {
    if (node.type === 'root' || node.type === 'folder') {
      enterFolder(node.id);
      return;
    }
    if (node.type === 'loading') {
      return;
    }
    if (!node.resourceId) return;
    openInWorkspace({
      resourceId: node.resourceId,
      resourceType: node.resourceType,
      resourceName: node.title,
      viewer,
      driveLocation: {
        scope: node.scope,
        nodeId: node.id,
        parentNodeId: node.parentId,
      },
    });
  };
};
