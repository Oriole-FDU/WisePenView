import React, { useCallback, useEffect, useState } from 'react';
import { Modal, Button, message } from 'antd';
import type { Folder } from '@/types/folder';
import type { ResourceItem } from '@/types/resource';
import { useResourceService, useTagService } from '@/contexts/ServicesContext';
import { parseErrorMessage } from '@/utils/parseErrorMessage';
import { isValidFolderMove } from '@/utils/path';
import TreeNav from '@/components/Common/TreeNav';
import type { MoveToFolderModalProps } from './index.type';
import styles from './index.module.less';

const MoveToFolderModal: React.FC<MoveToFolderModalProps> = ({
  open,
  onCancel,
  onSuccess,
  target,
}) => {
  const resourceService = useResourceService();
  const tagService = useTagService();
  const [selectedFolder, setSelectedFolder] = useState<Folder | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) setSelectedFolder(null);
  }, [open]);

  const handleFolderSelect = useCallback(
    (item: { type: 'file'; data: ResourceItem } | { type: 'folder'; data: Folder }) => {
      if (item.type === 'folder') {
        setSelectedFolder(item.data);
      }
    },
    []
  );

  const handleSubmit = useCallback(async () => {
    if (!target || !selectedFolder) return;
    if (target.type === 'folder' && !isValidFolderMove(target.data, selectedFolder)) {
      message.error('不能将文件夹移动到自身或其子目录下');
      return;
    }
    setSubmitting(true);
    try {
      if (target.type === 'file') {
        const targetPath = selectedFolder.tagName ?? '/';
        await resourceService.updateResourcePath({
          resourceId: target.data.resourceId,
          path: targetPath,
        });
        message.success(`已移动到 ~${targetPath === '/' ? '根目录' : targetPath}`);
      } else {
        const sourceName = target.data.tagName;
        const destName = selectedFolder.tagName || '~';
        await tagService.moveTag({
          targetTagId: target.data.tagId,
          newParentId: selectedFolder.tagId === 'path-root' ? undefined : selectedFolder.tagId,
        });
        message.success(`已将「${sourceName}」移动到「${destName}」下`);
      }
      onSuccess?.();
      onCancel();
    } catch (err) {
      message.error(parseErrorMessage(err, '移动失败'));
    } finally {
      setSubmitting(false);
    }
  }, [resourceService, tagService, target, selectedFolder, onSuccess, onCancel]);

  const handleCancel = useCallback(() => {
    setSelectedFolder(null);
    onCancel();
  }, [onCancel]);

  const displayName =
    target?.type === 'file'
      ? target.data.resourceName || '未命名'
      : (target?.data.tagName?.split('/').pop() ?? '');

  return (
    <Modal
      title="移动到文件夹"
      open={open && !!target}
      onCancel={handleCancel}
      footer={[
        <Button key="cancel" onClick={handleCancel}>
          取消
        </Button>,
        <Button
          key="confirm"
          type="primary"
          onClick={handleSubmit}
          loading={submitting}
          disabled={!selectedFolder}
        >
          确定
        </Button>,
      ]}
      width={480}
    >
      <div className={styles.wrapper}>
        <div className={styles.targetName}>即将移动：{displayName}</div>
        <div className={styles.treeSection}>
          <span className={styles.treeLabel}>选择目标文件夹：</span>
          <TreeNav onSelect={handleFolderSelect} showNewFolderButton className={styles.treeNav} />
        </div>
      </div>
    </Modal>
  );
};

export default MoveToFolderModal;
