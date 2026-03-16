import React from 'react';
import TreeDrive from '@/components/Drive/TreeDrive';

import styles from './drivePreview.module.less';

/**
 * 预览页：左右并排展示 TreeDrive 的 tag 模式与 folder 模式，便于对比与调试。
 * 路由：/app/preview/drive
 */
const DrivePreview: React.FC = () => {
  return (
    <div className={styles.container}>
      <div className={styles.panel}>
        <h2 className={styles.panelTitle}>标签树 (Tag mode)</h2>
        <div className={styles.panelContent}>
          <TreeDrive mode="tag" />
        </div>
      </div>
      <div className={styles.panel}>
        <h2 className={styles.panelTitle}>文件夹树 (Folder mode)</h2>
        <div className={styles.panelContent}>
          <TreeDrive mode="folder" />
        </div>
      </div>
    </div>
  );
};

export default DrivePreview;
