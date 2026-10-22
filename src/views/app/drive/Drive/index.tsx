import { Tabs, toast } from '@heroui/react';
import { type Key, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';

import { GuideAnchor, GuideScope, registerGuideActionHandlers } from '@/components/base/Guide';
import PageHeader from '@/components/base/PageHeader';
import DriveBrowser from '@/components/business/Drive/DriveBrowser';
import { GUIDE_ACTION_ID, GUIDE_TOOL_ID, GUIDE_TOUR_ID } from '@/constants/tour';
import { useDriveService } from '@/domains';
import { buildDriveNodeScope } from '@/domains/Drive';
import { useApi } from '@/hooks/useApi';
import { parseErrorMessage } from '@/utils/error';
import {
  buildDrivePath,
  buildDriveSystemFolderPath,
  DRIVE_FAVORITES_PATH,
  DRIVE_TRASH_PATH,
  DRIVE_UPLOAD_QUEUE_PATH,
} from '@/utils/navigation/driveRoute';
import underlineTabs from '@/views/app/_common/underlineTabs.module.scss';

import FavoritesTab from '../_components/FavoritesTab';
import UploadQueueTab from '../_components/UploadQueueTab';
import styles from './style.module.scss';

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
  const [previewViewMode, setPreviewViewMode] = useState<DriveViewMode | null>(null);
  const activeViewMode = previewViewMode ?? viewMode;
  const isTrashView = activeViewMode === 'trash';
  const activeFolderId = previewViewMode && previewViewMode !== 'tableDrive' ? undefined : folderId;

  /**
   * @wisepen-manual-effect
   * 执行时机：云盘页面挂载时注册引导切页动作。
   * 不可替代原因：引导层直接修改预览视图状态，避免切换路由导致页面卸载和引导中断。
   * cleanup：撤销四个动作处理器。
   */
  useEffect(() => {
    const registerView = (mode: DriveViewMode) => ({
      open: () => setPreviewViewMode(mode),
      close: () => setPreviewViewMode(null),
    });
    return registerGuideActionHandlers({
      [GUIDE_ACTION_ID.showDriveFiles]: registerView('tableDrive'),
      [GUIDE_ACTION_ID.showDriveUploadQueue]: registerView('uploadQueue'),
      [GUIDE_ACTION_ID.showDriveFavorites]: registerView('favorites'),
      [GUIDE_ACTION_ID.showDriveTrash]: registerView('trash'),
    });
  }, []);

  const { data: trashFolder } = useApi(
    () => driveService.getSystemFolder({ scope: driveScope, type: 'trash' }),
    {
      ready: isTrashView && !activeFolderId,
      refreshDeps: [activeViewMode, activeFolderId],
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

  const initialNodeId = activeFolderId ?? trashFolderNodeId;
  const isTrashPending = Boolean(isTrashView && !activeFolderId && !trashFolderNodeId);
  const tableDriveLocationKey = `${driveScope.rootId}\u0000${initialNodeId ?? driveScope.rootId}`;

  const handleTrashNodeChange = (nodeId: string) => {
    if (activeViewMode !== 'trash') return;
    if (nodeId === driveScope.rootId) {
      navigate(buildDrivePath({ scope: driveScope }));
      return;
    }
    navigate(buildDriveSystemFolderPath({ nodeId }));
  };

  return (
    <GuideScope tourId={viewMode === 'tableDrive' ? GUIDE_TOUR_ID.drive : undefined}>
      <PageHeader title={t('page.title')} subtitle={t('page.subtitle')} />

      <Tabs
        variant="secondary"
        selectedKey={activeViewMode}
        onSelectionChange={handleViewModeSelectionChange}
        className={`${underlineTabs.underlineTabs} ${styles.detailTabs}`}
      >
        <GuideAnchor id={GUIDE_TOOL_ID.driveViews} asChild>
          <Tabs.ListContainer>
            <Tabs.List aria-label={t('page.viewAria')}>
              {[
                {
                  key: 'tableDrive',
                  label: t('page.tabs.drive'),
                  toolId: GUIDE_TOOL_ID.driveTabFiles,
                },
                {
                  key: 'uploadQueue',
                  label: t('page.tabs.uploadQueue'),
                  toolId: GUIDE_TOOL_ID.driveTabUploadQueue,
                },
                {
                  key: 'favorites',
                  label: t('page.tabs.favorites'),
                  toolId: GUIDE_TOOL_ID.driveTabFavorites,
                },
                {
                  key: 'trash',
                  label: t('page.tabs.trash'),
                  toolId: GUIDE_TOOL_ID.driveTabTrash,
                },
              ].map((item) => (
                <Tabs.Tab key={item.key} id={item.key} data-guide-tool-id={item.toolId}>
                  {item.label}
                  <Tabs.Indicator />
                </Tabs.Tab>
              ))}
            </Tabs.List>
          </Tabs.ListContainer>
        </GuideAnchor>
      </Tabs>

      <div className={styles.previewContent} data-guide-tool-id={GUIDE_TOOL_ID.driveViewContent}>
        {activeViewMode === 'tableDrive' && (
          <DriveBrowser
            key={tableDriveLocationKey}
            scope={driveScope}
            initialNodeId={activeFolderId}
            onCurrentNodeChange={handleCurrentNodeChange}
          />
        )}
        {activeViewMode === 'uploadQueue' && <UploadQueueTab />}
        {activeViewMode === 'favorites' && <FavoritesTab />}
        {isTrashView ? (
          <DriveBrowser
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
    </GuideScope>
  );
}

export default Drive;
