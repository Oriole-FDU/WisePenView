import React, { useState } from 'react';
import { Button, Modal, Tabs } from 'antd';
import { AiOutlineTag, AiOutlineCloudUpload } from 'react-icons/ai';
import { TagManager } from '@/components/Tag';
import FlatViewDrive from '@/components/Drive/FlatViewDrive';
import FolderViewDrive from '@/components/Drive/FolderViewDrive';
import { useDrivePreferencesStore, type DriveViewMode } from '@/store';

import styles from './style.module.less';

const VIEW_TABS: { key: DriveViewMode; label: string }[] = [
  { key: 'folder', label: '文件夹管理' },
  { key: 'flat', label: '按标签管理' },
];

const Drive: React.FC = () => {
  const viewMode = useDrivePreferencesStore((s) => s.viewMode);
  const setViewMode = useDrivePreferencesStore((s) => s.setViewMode);
  const [tagModalOpen, setTagModalOpen] = useState(false);

  return (
    <div className={styles.pageContainer}>
      <div className={styles.pageHeaderWithActions}>
        <div>
          <h1 className={styles.pageTitle}>文档与云盘</h1>
          <span className={styles.pageSubtitle}>管理您的项目和文档</span>
        </div>
        <div className={styles.actionsRow}>
          <Button icon={<AiOutlineTag size={16} />} onClick={() => setTagModalOpen(true)}>
            管理标签
          </Button>
          <Button type="primary" icon={<AiOutlineCloudUpload size={16} />}>
            上传文件
          </Button>
        </div>
      </div>

      <div className={styles.tabsWithSearch}>
        <Tabs
          activeKey={viewMode}
          onChange={(k) => setViewMode(k as DriveViewMode)}
          items={VIEW_TABS}
          style={{ marginBottom: -1 }}
        />
      </div>

      <div className={styles.previewContent}>
        {viewMode === 'flat' && <FlatViewDrive />}
        {viewMode === 'folder' && <FolderViewDrive />}
      </div>

      <Modal
        title="管理标签"
        open={tagModalOpen}
        onCancel={() => setTagModalOpen(false)}
        footer={null}
        width={900}
        styles={{
          body: {
            height: 600,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          },
        }}
      >
        <TagManager />
      </Modal>
    </div>
  );
};

export default Drive;
