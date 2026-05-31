import React, { useCallback, useState } from 'react';
import { Button, Modal } from 'antd';
import { AiOutlineFolder } from 'react-icons/ai';
import { useGroupService } from '@/domains';
import { useChatPageStore } from '@/store';
import { useRequest } from 'ahooks';
import DriveNav from '@/components/Drive/DriveNav';
import type { DriveSelectionItem } from '@/components/Drive/common/driveComponentModel';
import type { DocumentPickerModalProps } from './index.type';
import styles from './style.module.less';

const DocumentPickerModal: React.FC<DocumentPickerModalProps> = ({
  open,
  onClose,
}) => {
  const groupService = useGroupService();
  const addDocRef = useChatPageStore((s) => s.addDocRef);
  const [selectedItems, setSelectedItems] = useState<DriveSelectionItem[]>([]);

  const { data: joinedGroupData } = useRequest(
    () => groupService.fetchGroupList({ groupRoleFilter: 'JOINED', page: 1, size: 100 }),
    {
      ready: open,
      refreshDeps: [open],
    }
  );

  const groups = joinedGroupData?.groups ?? [];

  const handleConfirm = useCallback(() => {
    for (const item of selectedItems) {
      if (item.resourceId) {
        addDocRef({
          resourceId: item.resourceId,
          resourceName: item.name ?? item.resourceId,
          enabled: true,
        });
      }
    }
    onClose();
  }, [selectedItems, addDocRef, onClose]);

  const handlePersonalChange = useCallback((items: DriveSelectionItem[]) => {
    setSelectedItems((prev) => {
      const others = prev.filter((i) => i.scope?.type !== 'personal');
      return [...others, ...items];
    });
  }, []);

  const handleGroupChange = useCallback((groupId: string, items: DriveSelectionItem[]) => {
    setSelectedItems((prev) => {
      const others = prev.filter((i) => !(i.scope?.type === 'group' && i.scope.groupId === groupId));
      return [...others, ...items];
    });
  }, []);

  return (
    <Modal
      title="从文档库选择"
      open={open}
      onCancel={onClose}
      destroyOnHidden
      width={560}
      footer={[
        <Button key="cancel" onClick={onClose}>
          取消
        </Button>,
        <Button key="confirm" type="primary" onClick={handleConfirm} disabled={selectedItems.length === 0}>
          确认
        </Button>,
      ]}
    >
      <div className={styles.wrapper}>
        <div className={styles.hint}>选择要引用的文档（可多选）</div>

        <div className={styles.section}>
          <div className={styles.sectionTitle}>
            <AiOutlineFolder size={14} color="var(--ant-color-warning)" />
            <span>个人文件</span>
          </div>
          <div className={styles.sectionContent}>
            <DriveNav
              scope={{ type: 'personal' }}
              selectableTypes={['resource', 'link']}
              multiple
              onChange={handlePersonalChange}
            />
          </div>
        </div>

        {groups.map((group) => (
          <div key={group.groupId} className={styles.section}>
            <div className={styles.sectionTitle}>
              <AiOutlineFolder size={14} color="var(--ant-color-warning)" />
              <span>{group.groupName}</span>
            </div>
            <div className={styles.sectionContent}>
              <DriveNav
                scope={{ type: 'group', groupId: group.groupId }}
                groupId={group.groupId}
                selectableTypes={['resource', 'link']}
                multiple
                onChange={(items) => handleGroupChange(group.groupId, items)}
              />
            </div>
          </div>
        ))}
      </div>
    </Modal>
  );
};

export default DocumentPickerModal;