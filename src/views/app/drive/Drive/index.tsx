import { Tabs, toast } from '@heroui/react';
import type { Key } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';

import TableDrive from '@/components/business/Drive/TableDrive';
import { useDriveService } from '@/domains';
import { buildDriveNodeScope } from '@/domains/Drive';
import { useApi } from '@/hooks/useApi';
import PageHeader from '@/layouts/_common/PageHeader';
import { parseErrorMessage } from '@/utils/error';
import {
  buildDrivePath,
  buildDriveSystemFolderPath,
  DRIVE_FAVORITES_PATH,
  DRIVE_TRASH_PATH,
  DRIVE_UPLOAD_QUEUE_PATH,
} from '@/utils/navigation/driveRoute';
import underlineTabs from '@/views/app/_common/underlineTabs.module.less';

import FavoritesTab from '../_components/FavoritesTab';
import UploadQueueTab from '../_components/UploadQueueTab';
import styles from './style.module.less';

export type DriveViewMode = 'uploadQueue' | 'tableDrive' | 'favorites' | 'trash';

interface DriveProps {
  viewMode?: DriveViewMode;
}

function Drive({ viewMode = 'tableDrive' }: DriveProps) {
  const { t } = useTranslation('drive');
  const navigate = useNavigate();
  const { folderId } = useParams();
  const driveService = useDriveService();
  const driveScope = buildDriveNodeScope();
  const isTrashView = viewMode === 'trash';

  const { data: trashFolder } = useApi(
    () => driveService.getSystemFolder({ scope: driveScope, type: 'trash' }),
    {
      ready: isTrashView && !folderId,
      refreshDeps: [viewMode, folderId],
    }
  );
  const trashFolderNodeId = trashFolder?.id;

  const handleCurrentNodeChange = (nodeId: string) => {
    navigate(buildDrivePath({ scope: driveScope, nodeId }));
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
    if (nextViewMode === 'trash') {
      navigate(DRIVE_TRASH_PATH);
      return;
    }
    navigate(buildDrivePath({ scope: driveScope }));
  };

  const handleViewModeSelectionChange = (key: Key) => {
    const nextViewMode = String(key);
    if (
      nextViewMode === 'uploadQueue' ||
      nextViewMode === 'tableDrive' ||
      nextViewMode === 'favorites' ||
      nextViewMode === 'trash'
    ) {
      handleViewModeChange(nextViewMode);
    }
  };

  const initialNodeId = folderId ?? trashFolderNodeId;
  const isTrashPending = Boolean(isTrashView && !folderId && !trashFolderNodeId);
  const tableDriveLocationKey = `${driveScope.rootId}\u0000${initialNodeId ?? driveScope.rootId}`;

  const handleTrashNodeChange = (nodeId: string) => {
    if (viewMode !== 'trash') return;
    if (nodeId === driveScope.rootId) {
      navigate(buildDrivePath({ scope: driveScope }));
      return;
    }
    navigate(buildDriveSystemFolderPath({ nodeId }));
  };

  return (
    <>
      <PageHeader title={t('page.title')} subtitle={t('page.subtitle')} />

      <Tabs
        variant="secondary"
        selectedKey={viewMode}
        onSelectionChange={handleViewModeSelectionChange}
        className={`${underlineTabs.underlineTabs} ${styles.detailTabs}`}
      >
        <Tabs.ListContainer>
          <Tabs.List aria-label={t('page.viewAria')}>
            {[
              { key: 'tableDrive', label: t('page.tabs.drive') },
              { key: 'uploadQueue', label: t('page.tabs.uploadQueue') },
              { key: 'favorites', label: t('page.tabs.favorites') },
              { key: 'trash', label: t('page.tabs.trash') },
            ].map((item) => (
              <Tabs.Tab key={item.key} id={item.key}>
                {item.label}
                <Tabs.Indicator />
              </Tabs.Tab>
            ))}
          </Tabs.List>
        </Tabs.ListContainer>
      </Tabs>

      <div className={styles.previewContent}>
        {viewMode === 'tableDrive' && (
          <TableDrive
            key={tableDriveLocationKey}
            scope={driveScope}
            initialNodeId={folderId}
            onCurrentNodeChange={handleCurrentNodeChange}
          />
        )}
        {viewMode === 'uploadQueue' && <UploadQueueTab />}
        {viewMode === 'favorites' && <FavoritesTab />}
        {isTrashView ? (
          <TableDrive
            key={tableDriveLocationKey}
            scope={driveScope}
            initialNodeId={initialNodeId}
            loading={isTrashPending}
            onCurrentNodeChange={handleTrashNodeChange}
            onPathError={(error) => {
              toast.danger(parseErrorMessage(error));
              navigate(DRIVE_TRASH_PATH, { replace: true });
            }}
          />
        ) : null}
      </div>
    </>
  );
}

export default Drive;
