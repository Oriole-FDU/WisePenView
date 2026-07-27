import { useDriveService } from '@/domains';
import type { DriveNode, DriveNodeScope } from '@/domains/Drive';
import { buildLoadingNode } from '@/domains/Drive/mapper/DriveServices.map';
import { parseErrorMessage } from '@/utils/error';
import { toast } from '@heroui/react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

interface UseDriveTreeChildrenParams {
  groupId?: string;
  scope?: DriveNodeScope;
}

interface UseDriveTreeChildrenReturn {
  childrenMap: Map<string, DriveNode[]>;
  loadChildren: (nodeId: string) => Promise<DriveNode[]>;
  reset: () => void;
}

export function useDriveTreeChildren({
  groupId,
  scope,
}: UseDriveTreeChildrenParams): UseDriveTreeChildrenReturn {
  const { t } = useTranslation('drive');
  const driveService = useDriveService();
  const [childrenMap, setChildrenMap] = useState<Map<string, DriveNode[]>>(new Map());

  const setNodeChildren = (nodeId: string, children: DriveNode[]) => {
    setChildrenMap((prev) => {
      const next = new Map(prev);
      next.set(nodeId, children);
      return next;
    });
  };

  const loadChildren = async (nodeId: string): Promise<DriveNode[]> => {
    setNodeChildren(nodeId, [buildLoadingNode(nodeId, t('node.loading'), scope)]);
    try {
      const children = await driveService.listNodeChildren({ nodeId, groupId });
      setNodeChildren(nodeId, children);
      return children;
    } catch (err) {
      toast.danger(parseErrorMessage(err));
      setNodeChildren(nodeId, []);
      return [];
    }
  };

  const reset = () => {
    setChildrenMap(new Map());
  };

  return {
    childrenMap,
    loadChildren,
    reset,
  };
}
