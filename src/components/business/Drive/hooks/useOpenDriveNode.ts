import type { ResourceViewer } from '@/domains/Resource';
import { useOpenResource } from '@/hooks/useOpenResource';

import type { DriveViewNode } from '../common/driveComponentModel';

export interface UseOpenDriveNodeParams {
  /** 进入 root / folder 等容器型节点（通常由 Drive navigation hook 提供） */
  enterFolder: (nodeId: string) => void;
}

/**
 * Drive 节点打开行为的统一入口，按 node.type 路由。
 */
export const useOpenDriveNode = ({ enterFolder }: UseOpenDriveNodeParams) => {
  const openResource = useOpenResource();

  return (node: DriveViewNode, viewer?: ResourceViewer) => {
    if (node.type === 'root' || node.type === 'folder') {
      enterFolder(node.id);
      return;
    }
    if (node.type === 'loading') return;
    if (!node.resourceId) return;
    openResource({
      resourceId: node.resourceId,
      resourceType: node.resourceType,
      resourceName: node.title,
      viewer,
      driveLocation: {
        scope: node.scope,
        mountTagId: node.mountTagId,
      },
    });
  };
};
