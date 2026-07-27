import TableDrive from '@/components/Drive/TableDrive';
import SegmentedTabs from '@/components/SegmentedTabs';
import { useWorkspaceNavigationStore } from '@/layouts/Workspace/_store/useWorkspaceNavigationStore';
import SidebarDriveScopeSwitcher from '@/layouts/_common/Sidebar/DriveSidebar/_components/SidebarDrive/SidebarDriveScopeSwitcher';
import {
  buildDrivePath,
  DRIVE_FAVORITES_PATH,
  DRIVE_UPLOAD_QUEUE_PATH,
  parseDriveRouteLocation,
} from '@/utils/navigation/driveRoute';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';

import FavoritesTab from '../_components/FavoritesTab';
import UploadQueueTab from '../_components/UploadQueueTab';
import styles from './style.module.less';

export type DriveViewMode = 'uploadQueue' | 'tableDrive' | 'favorites';

interface DriveProps {
  viewMode?: DriveViewMode;
}

function Drive({ viewMode = 'tableDrive' }: DriveProps) {
  const { t } = useTranslation('drive');
  const navigate = useNavigate();
  const { folderId, groupId } = useParams();
  const driveLocation = parseDriveRouteLocation({ groupId, folderId });
  const workspaceScope = useWorkspaceNavigationStore((state) => state.location.scope);

  /**
   * @wisepen-manual-effect
   * 执行时机：URL 路由范围或云盘视图模式变化后同步 workspace scope。
   * 不可替代原因：React Router 与工作区 Zustand store 是两个独立状态系统。
   * cleanup：没有订阅或延迟任务，无需清理。
   */
  useEffect(() => {
    if (viewMode !== 'tableDrive') return;

    const nextScope = parseDriveRouteLocation({ groupId }).scope;
    const currentScope = useWorkspaceNavigationStore.getState().location.scope;
    const currentGroupId = currentScope.type === 'group' ? currentScope.groupId : undefined;
    const nextGroupId = nextScope.type === 'group' ? nextScope.groupId : undefined;
    if (currentScope.rootId === nextScope.rootId && currentGroupId === nextGroupId) {
      return;
    }
    useWorkspaceNavigationStore.getState().navigateToScope(nextScope);
  }, [groupId, viewMode]);

  const handleCurrentNodeChange = (nodeId: string) => {
    navigate(buildDrivePath({ scope: driveLocation.scope, nodeId }));
  };

  const handleViewModeChange = (nextViewMode: DriveViewMode) => {
    if (nextViewMode === viewMode) return;
    if (nextViewMode === 'uploadQueue') {
      navigate(DRIVE_UPLOAD_QUEUE_PATH);
      return;
    }
    if (nextViewMode === 'favorites') {
      navigate(DRIVE_FAVORITES_PATH);
      return;
    }
    navigate(buildDrivePath({ scope: workspaceScope }));
  };

  const tableDriveLocationKey = `${driveLocation.scope.rootId}\u0000${driveLocation.initialNodeId ?? driveLocation.scope.rootId}`;

  return (
    <div className={styles.pageContainer}>
      <header className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>{t('page.title')}</h1>
        <span className={styles.pageSubtitle}>{t('page.subtitle')}</span>
      </header>

      <SegmentedTabs<DriveViewMode>
        ariaLabel={t('page.viewAria')}
        selectedKey={viewMode}
        onSelectionChange={handleViewModeChange}
        items={[
          { key: 'tableDrive', label: t('page.tabs.drive') },
          { key: 'uploadQueue', label: t('page.tabs.uploadQueue') },
          { key: 'favorites', label: t('page.tabs.favorites') },
        ]}
        className={styles.detailTabs}
      />

      <div className={styles.previewContent}>
        {viewMode === 'tableDrive' && (
          <TableDrive
            key={tableDriveLocationKey}
            scope={driveLocation.scope}
            breadcrumbExtra={<SidebarDriveScopeSwitcher />}
            initialNodeId={driveLocation.initialNodeId}
            onCurrentNodeChange={handleCurrentNodeChange}
          />
        )}
        {viewMode === 'uploadQueue' && <UploadQueueTab />}
        {viewMode === 'favorites' && <FavoritesTab />}
      </div>
    </div>
  );
}

export default Drive;
