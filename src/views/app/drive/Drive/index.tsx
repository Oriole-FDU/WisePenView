import TableDrive from '@/components/Drive/TableDrive';
import type { TableDriveHandle } from '@/components/Drive/TableDrive/index.type';
import SegmentedTabs from '@/components/SegmentedTabs';
import { parseDriveRouteLocation } from '@/utils/navigation/driveRoute';
import { Button } from '@heroui/react';
import { Trash2 } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useDrivePreferencesStore, type DriveViewMode } from '../_store/useDrivePreferencesStore';

import FavoritesTab from '../_components/FavoritesTab';
import GlobalSearchBox from '../_components/GlobalSearchBox';
import type { UploadQueueTabRef } from '../_components/UploadQueueTab';
import UploadQueueTab from '../_components/UploadQueueTab';
import styles from './style.module.less';

const VIEW_TABS: { key: DriveViewMode; label: string }[] = [
  { key: 'tableDrive', label: '云盘' },
  { key: 'uploadQueue', label: '上传队列' },
  { key: 'favorites', label: '我的收藏' },
];

function Drive() {
  const location = useLocation();
  const driveLocation = useMemo(() => parseDriveRouteLocation(location.search), [location.search]);
  const viewMode = useDrivePreferencesStore((s) => s.viewMode);
  const setViewMode = useDrivePreferencesStore((s) => s.setViewMode);
  const tableDriveRef = useRef<TableDriveHandle>(null);
  const uploadQueueRef = useRef<UploadQueueTabRef>(null);
  const [isTrashView, setIsTrashView] = useState(false);

  const handleUploadSuccess = () => {
    uploadQueueRef.current?.refresh();
  };

  const activeViewMode: DriveViewMode = VIEW_TABS.some((tab) => tab.key === viewMode)
    ? viewMode
    : 'tableDrive';

  return (
    <div className={styles.pageContainer}>
      <div className={styles.pageHeaderWithActions}>
        <div>
          <h1 className={styles.pageTitle}>文档与云盘</h1>
          <span className={styles.pageSubtitle}>管理您的项目和文档</span>
        </div>
        <div className={styles.actionsRow}>
          <GlobalSearchBox scope={driveLocation.scope} />
          {activeViewMode === 'tableDrive' ? (
            <Button
              variant="primary"
              className={styles.pageTrashButton}
              onPress={() => void tableDriveRef.current?.openTrash()}
            >
              <Trash2 size={16} aria-hidden="true" />
              {isTrashView ? '返回云盘' : '回收站'}
            </Button>
          ) : null}
        </div>
      </div>

      <SegmentedTabs<DriveViewMode>
        ariaLabel="云盘视图"
        selectedKey={activeViewMode}
        onSelectionChange={setViewMode}
        items={VIEW_TABS}
        className={styles.detailTabs}
      />

      <div className={styles.previewContent}>
        {activeViewMode === 'tableDrive' && (
          <TableDrive
            ref={tableDriveRef}
            scope={driveLocation.scope}
            initialNodeId={driveLocation.initialNodeId}
            showToolbarTrash={false}
            onTrashViewChange={setIsTrashView}
            onUploadSuccess={handleUploadSuccess}
          />
        )}
        {activeViewMode === 'uploadQueue' && <UploadQueueTab ref={uploadQueueRef} />}
        {activeViewMode === 'favorites' && <FavoritesTab />}
      </div>
    </div>
  );
}

export default Drive;
