import IconText from '@/components/Common/IconText';
import SegmentedTabs from '@/components/Common/SegmentedTabs';
import GlobalSearchBox from '@/components/Drive/GlobalSearchBox';
import { StickerManageModal } from '@/components/Drive/Modals';
import TableDrive from '@/components/Drive/TableDrive';
import { useDrivePreferencesStore, type DriveViewMode } from '@/store';
import { Button } from '@heroui/react';
import { CloudUpload, Tags } from 'lucide-react';
import { useRef, useState } from 'react';

import FlatDrive from '../_components/FlatDrive';
import type { UploadQueueTabRef } from '../_components/UploadQueueTab';
import UploadQueueTab from '../_components/UploadQueueTab';
import { UploadDocumentModal } from './UploadDocumentModal';
import styles from './style.module.less';

const VIEW_TABS: { key: DriveViewMode; label: string }[] = [
  { key: 'tableDrive', label: '云盘' },
  { key: 'flat', label: '标签管理' },
  { key: 'uploadQueue', label: '上传队列' },
];

function Drive() {
  const viewMode = useDrivePreferencesStore((s) => s.viewMode);
  const setViewMode = useDrivePreferencesStore((s) => s.setViewMode);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [stickerManageOpen, setStickerManageOpen] = useState(false);
  const uploadQueueRef = useRef<UploadQueueTabRef>(null);

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
          <GlobalSearchBox />
          <Button variant="secondary" onPress={() => setStickerManageOpen(true)}>
            <IconText icon={<Tags />} iconSize={16}>
              管理标签
            </IconText>
          </Button>
          <Button variant="primary" onPress={() => setUploadModalOpen(true)}>
            <IconText icon={<CloudUpload />} iconSize={16}>
              上传文件
            </IconText>
          </Button>
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
        {activeViewMode === 'flat' && <FlatDrive />}
        {activeViewMode === 'tableDrive' && <TableDrive />}
        {activeViewMode === 'uploadQueue' && <UploadQueueTab ref={uploadQueueRef} />}
      </div>

      <UploadDocumentModal
        isOpen={uploadModalOpen}
        onOpenChange={setUploadModalOpen}
        onSuccess={handleUploadSuccess}
      />
      <StickerManageModal isOpen={stickerManageOpen} onOpenChange={setStickerManageOpen} />
    </div>
  );
}

export default Drive;
