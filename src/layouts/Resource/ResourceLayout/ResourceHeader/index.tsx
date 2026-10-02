import { useState } from 'react';

import ResourcePermissionModal from '@/components/business/Resource/ResourcePermissionModal';
import { useUserService } from '@/domains';
import { useApi } from '@/hooks/useApi';
import { normalizeId } from '@/utils/normalize/normalizeId';

import type { ResourceHeaderProps } from './index.type';
import ResourceHeaderActions from './ResourceHeaderActions';
import ResourceHeaderBreadcrumb from './ResourceHeaderBreadcrumb';
import styles from './style.module.less';

/**
 * 资源顶栏：面包屑区与动作区分开装配。
 *
 * 面包屑表达资源在驱动器里的位置，动作区承载编辑器提供的动作与资源管理菜单；
 * 权限弹窗由这里持有，因为它依赖当前用户与资源所有者的比对结果。
 */
export default function ResourceHeader({
  resourceId,
  resourceName,
  resourceType,
  resourceIconType,
  resourceInfo,
  currentActions,
  copyVersion,
  permissionResourceType,
  ownerId,
  onPermissionSuccess,
  isDisabled,
  titleMeta,
  breadcrumbItems,
  leadingActions,
  actions,
  moreMenu,
  hideBreadcrumb,
  trailingActions,
}: ResourceHeaderProps) {
  const userService = useUserService();
  const [isPermissionModalOpen, setIsPermissionModalOpen] = useState(false);
  const normalizedOwnerId = normalizeId(ownerId);
  const { data: currentUser } = useApi(() => userService.getUserInfo(), {
    ready: Boolean(resourceId && normalizedOwnerId),
    refreshDeps: [resourceId, normalizedOwnerId],
  });
  const canManagePermission = Boolean(
    resourceId && normalizedOwnerId && currentUser?.id === normalizedOwnerId
  );

  return (
    <>
      <div className={styles.root}>
        <ResourceHeaderBreadcrumb
          resourceId={resourceId}
          resourceName={resourceName}
          resourceType={resourceType}
          resourceIconType={resourceIconType}
          breadcrumbItems={breadcrumbItems}
          hideBreadcrumb={hideBreadcrumb}
          titleMeta={titleMeta}
        />
        <ResourceHeaderActions
          resourceId={resourceId}
          resourceName={resourceName}
          resourceType={resourceType}
          permissionResourceType={permissionResourceType}
          resourceInfo={resourceInfo}
          currentActions={currentActions}
          copyVersion={copyVersion}
          moreMenu={moreMenu}
          isDisabled={isDisabled}
          leadingActions={leadingActions}
          actions={actions}
          trailingActions={trailingActions}
          canManagePermission={canManagePermission}
          onOpenPermission={() => setIsPermissionModalOpen(true)}
        />
      </div>
      {resourceId && canManagePermission ? (
        <ResourcePermissionModal
          isOpen={isPermissionModalOpen}
          onOpenChange={setIsPermissionModalOpen}
          resourceId={resourceId}
          resourceType={permissionResourceType}
          onSuccess={onPermissionSuccess}
        />
      ) : null}
    </>
  );
}
