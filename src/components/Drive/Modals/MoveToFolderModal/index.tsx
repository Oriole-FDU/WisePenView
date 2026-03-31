import React, { useCallback, useState } from 'react';
import { Modal, Button } from 'antd';
import { useRequest } from 'ahooks';
import type { TagTreeNode } from '@/services/Tag/index.type';
import type { ResourceItem } from '@/types/resource';
import { useFolderService } from '@/contexts/ServicesContext';
import { parseErrorMessage } from '@/utils/parseErrorMessage';
import TreeNav from '@/components/Drive/TreeNav';
import ReadOnlyBreadcrumb from '@/components/Common/ReadOnlyBreadcrumb';
import type { MoveToFolderModalProps } from './index.type';
import { useAppMessage } from '@/hooks/useAppMessage';
import styles from './index.module.less';

const MoveToFolderModal: React.FC<MoveToFolderModalProps> = ({
  open,
  onCancel,
  onSuccess,
  target,
  groupId,
}) => {
  const folderService = useFolderService();
  const message = useAppMessage();
  const [selectedNode, setSelectedNode] = useState<TagTreeNode | null>(null);

  const handleOpenChange = useCallback((visible: boolean) => {
    if (visible) {
      setSelectedNode(null);
    }
  }, []);

  const handleTreeNavChange = useCallback((selected: TagTreeNode[], _leaves: ResourceItem[]) => {
    setSelectedNode(selected.length > 0 ? selected[0] : null);
  }, []);

  const { loading: submitting, run: runMove } = useRequest(
    async () => {
      if (!target || !selectedNode) return;
      if (target.type === 'file') {
        await folderService.moveResourceToFolder(selectedNode, target.data);
        return '文件已移动';
      }
      await folderService.moveFolderToFolder(target.data, selectedNode);
      return '文件夹已移动';
    },
    {
      manual: true,
      onSuccess: (successText) => {
        if (successText) {
          message.success(successText);
        }
        onSuccess?.();
        onCancel();
      },
      onError: (err) => {
        message.error(parseErrorMessage(err, '移动失败'));
      },
    }
  );

  const handleSubmit = useCallback(async () => {
    if (!target || !selectedNode) return;
    runMove();
  }, [target, selectedNode, runMove]);

  const handleCancel = useCallback(() => {
    setSelectedNode(null);
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
      afterOpenChange={handleOpenChange}
      destroyOnHidden
      footer={[
        <Button key="cancel" onClick={handleCancel}>
          取消
        </Button>,
        <Button
          key="confirm"
          type="primary"
          onClick={handleSubmit}
          loading={submitting}
          disabled={!selectedNode}
        >
          确定
        </Button>,
      ]}
      width={480}
    >
      <div className={styles.wrapper}>
        <div className={styles.targetName}>即将移动：{displayName}</div>
        <div className={styles.breadcrumbSection}>
          <span className={styles.treeLabel}>
            {selectedNode ? '目标位置：' : '请在下方选择目标文件夹'}
          </span>
          {selectedNode && <ReadOnlyBreadcrumb node={selectedNode} mode="folder" />}
        </div>
        <div className={`${styles.treeSection} ${styles.treeNav}`}>
          <TreeNav
            viewMode="folder"
            selectMode="nodes"
            groupId={groupId}
            onChange={handleTreeNavChange}
          />
        </div>
      </div>
    </Modal>
  );
};

export default MoveToFolderModal;
