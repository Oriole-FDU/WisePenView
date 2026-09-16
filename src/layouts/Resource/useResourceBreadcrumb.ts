import { useTranslation } from 'react-i18next';

import type { AppBreadcrumbItem } from '@/components/base/AppBreadcrumb';
import {
  getDriveNodeLabel,
  getDriveScopeGroupId,
} from '@/components/business/Drive/common/driveComponentModel';
import { useDriveService, useGroupService } from '@/domains';
import type { DriveResourceLocation } from '@/domains/Drive';
import { useApi } from '@/hooks/useApi';
import { buildDrivePath } from '@/utils/navigation/driveRoute';

export function useResourceBreadcrumb(resourceId?: string, driveLocation?: DriveResourceLocation) {
  const { t } = useTranslation('workspace');
  const driveService = useDriveService();
  const groupService = useGroupService();
  const scope = driveLocation?.scope;
  const groupId = scope ? getDriveScopeGroupId(scope) : undefined;
  const mountTagId = driveLocation?.mountTagId;

  const { data } = useApi(
    async () => {
      const activeLocation = driveLocation!;
      const [pathNodes, group] = await Promise.all([
        driveService.getMountPath({ location: activeLocation }),
        groupId ? groupService.fetchGroupBaseInfo(groupId) : Promise.resolve(undefined),
      ]);

      return {
        resourceId,
        mountTagId: activeLocation.mountTagId,
        scopeRootId: activeLocation.scope.rootId,
        items: pathNodes.map<AppBreadcrumbItem>((node, index) => ({
          key: node.id,
          label:
            index === 0
              ? group?.groupName ||
                (groupId ? t('breadcrumb.unnamedGroup') : t('breadcrumb.personalDrive'))
              : getDriveNodeLabel(node),
          to: buildDrivePath({ scope: activeLocation.scope, nodeId: node.id }),
        })),
      };
    },
    {
      ready: Boolean(resourceId && driveLocation),
      refreshDeps: [resourceId, mountTagId, scope?.rootId, groupId, t],
    }
  );

  const items =
    resourceId &&
    driveLocation &&
    data?.resourceId === resourceId &&
    data?.mountTagId === driveLocation.mountTagId &&
    data?.scopeRootId === driveLocation.scope.rootId
      ? data.items
      : [];

  return items;
}
