import IconText from '@/components/Common/IconText';
import FlatDrive from '@/components/Drive/FlatDrive';
import { StickerManageModal } from '@/components/Drive/Modals';
import TableDrive from '@/components/Drive/TableDrive';
import type { UploadQueueTabRef } from '@/components/Drive/UploadQueueTab';
import UploadQueueTab from '@/components/Drive/UploadQueueTab';
import { useDrivePreferencesStore, type DriveViewMode } from '@/store';
import { Button } from '@heroui/react';
import { Tabs } from 'antd';
import { useCallback, useRef, useState } from 'react';
import { AiOutlineCloudUpload } from 'react-icons/ai';
import { LuTags } from 'react-icons/lu';

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

  const handleUploadSuccess = useCallback(() => {
    uploadQueueRef.current?.refresh();
  }, []);
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
          <Button variant="secondary" onPress={() => setStickerManageOpen(true)}>
            <IconText icon={<LuTags />} iconSize={16}>
              管理标签
            </IconText>
          </Button>
          <Button variant="primary" onPress={() => setUploadModalOpen(true)}>
            <IconText icon={<AiOutlineCloudUpload />} iconSize={16}>
              上传文件
            </IconText>
          </Button>
        </div>
      </div>

      <Tabs
        activeKey={activeViewMode}
        onChange={(k) => setViewMode(k as DriveViewMode)}
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
      <StickerManageModal open={stickerManageOpen} onCancel={() => setStickerManageOpen(false)} />
    </div>
  );
}

export default Drive;
