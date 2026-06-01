import { useDriveService } from '@/domains';
import type { DriveNode, LoadMoreNode } from '@/domains/Drive';
import { parseErrorMessage } from '@/utils/error';
import { toast } from '@heroui/react';
import { useCallback, useState } from 'react';

interface UseDriveTreeChildrenParams {
  groupId?: string;
}

interface UseDriveTreeChildrenReturn {
  childrenMap: Map<string, DriveNode[]>;
  loadChildren: (nodeId: string) => Promise<DriveNode[]>;
  loadMore: (node: LoadMoreNode) => Promise<DriveNode[]>;
  reset: () => void;
}

export function useDriveTreeChildren({
  groupId,
}: UseDriveTreeChildrenParams): UseDriveTreeChildrenReturn {
  const driveService = useDriveService();
  const [childrenMap, setChildrenMap] = useState<Map<string, DriveNode[]>>(new Map());

  const setNodeChildren = useCallback((nodeId: string, children: DriveNode[]) => {
    setChildrenMap((prev) => {
      const next = new Map(prev);
      next.set(nodeId, children);
      return next;
    });
  }, []);

  const loadChildren = useCallback(
    async (nodeId: string): Promise<DriveNode[]> => {
      try {
        const children = await driveService.loadNodeChildren({ nodeId, groupId });
        setNodeChildren(nodeId, children);
        return children;
      } catch (err) {
        toast.danger(parseErrorMessage(err));
        return [];
      }
    },
    [driveService, groupId, setNodeChildren]
  );

  const loadMore = useCallback(
    async (node: LoadMoreNode): Promise<DriveNode[]> => {
      try {
        const children = await driveService.loadMore({ parentNodeId: node.parentId, groupId });
        setNodeChildren(node.parentId, children);
        return children;
      } catch (err) {
        toast.danger(parseErrorMessage(err));
        return [];
      }
    },
    [driveService, groupId, setNodeChildren]
  );

  const reset = useCallback(() => {
    setChildrenMap(new Map());
  }, []);

  return {
    childrenMap,
    loadChildren,
    loadMore,
    reset,
  };
}
