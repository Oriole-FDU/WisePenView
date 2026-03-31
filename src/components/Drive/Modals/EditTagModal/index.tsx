import React, { useCallback, useMemo, useState } from 'react';
import { Modal, Button } from 'antd';
import { useRequest } from 'ahooks';
import type { TagTreeNode } from '@/services/Tag/index.type';
import type { ResourceItem } from '@/types/resource';
import { useResourceService } from '@/contexts/ServicesContext';
import { parseErrorMessage } from '@/utils/parseErrorMessage';
import TreeNav from '@/components/Drive/TreeNav';
import { useAppMessage } from '@/hooks/useAppMessage';
import type { EditTagModalProps } from './index.type';
import styles from './index.module.less';

const EditTagModal: React.FC<EditTagModalProps> = ({
  open,
  onCancel,
  onSuccess,
  groupId,
  target,
}) => {
  const resourceService = useResourceService();
  const message = useAppMessage();
  const [selectedNodes, setSelectedNodes] = useState<TagTreeNode[]>([]);

  const isFile = target?.type === 'file';
  const resourceId = isFile ? target.data.resourceId : undefined;

  const tagInitialCheckedIds = useMemo(() => {
    if (!open || target?.type !== 'file') return undefined;
    return Object.keys(target.data.currentTags ?? {});
  }, [open, target]);

  const handleOpenChange = useCallback((visible: boolean) => {
    if (!visible) {
      setSelectedNodes([]);
    }
  }, []);

  const handleTreeChange = useCallback((selected: TagTreeNode[], _leaves: ResourceItem[]) => {
    setSelectedNodes(selected);
  }, []);

  const { loading: submitting, run: runUpdateTags } = useRequest(
    async () => {
      if (!resourceId) return;
      await resourceService.updateResourceTags({
        resourceId,
        tagIds: selectedNodes.map((n) => n.tagId),
        ...(groupId ? { groupId } : {}),
      });
    },
    {
      manual: true,
      onSuccess: () => {
        message.success('标签已更新');
        onSuccess?.();
        onCancel();
      },
      onError: (err) => {
        message.error(parseErrorMessage(err, '更新标签失败'));
      },
    }
  );

  const handleSubmit = useCallback(async () => {
    if (!resourceId) return;
    runUpdateTags();
  }, [resourceId, runUpdateTags]);

  const handleCancel = useCallback(() => {
    setSelectedNodes([]);
    onCancel();
  }, [onCancel]);

  const displayName = isFile ? target.data.resourceName || '未命名' : '';

  return (
    <Modal
      title="编辑标签"
      open={open && !!target && isFile}
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
          disabled={!isFile}
        >
          确定
        </Button>,
      ]}
      width={480}
    >
      <div className={styles.wrapper}>
        {!isFile && target != null && <div className={styles.hint}>仅支持编辑文件的标签</div>}
        {isFile && (
          <>
            <div className={styles.fileName}>文件：{displayName}</div>
            <div className={styles.hint}>勾选或取消勾选以调整该文件关联的标签</div>
            <div className={`${styles.treeSection} ${styles.treeNav}`}>
              <TreeNav
                viewMode="tag"
                selectMode="nodes"
                groupId={groupId}
                tagInitialCheckedIds={tagInitialCheckedIds}
                onChange={handleTreeChange}
              />
            </div>
          </>
        )}
      </div>
    </Modal>
  );
};

export default EditTagModal;
