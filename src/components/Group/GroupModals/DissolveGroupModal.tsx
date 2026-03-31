import React, { useCallback, useState } from 'react';
import { Modal, Button, Input, Alert } from 'antd';
import { useRequest } from 'ahooks';
import { useNavigate } from 'react-router-dom';
import { useGroupService } from '@/contexts/ServicesContext';
import type { DeleteGroupRequest } from '@/services/Group';
import type { DissolveGroupModalProps } from './index.type';
import styles from './style.module.less';
import { useAppMessage } from '@/hooks/useAppMessage';
import { parseErrorMessage } from '@/utils/parseErrorMessage';

const DissolveGroupModal: React.FC<DissolveGroupModalProps> = ({
  open,
  onCancel,
  groupName,
  groupId,
  onSuccess,
}) => {
  const groupService = useGroupService();
  const message = useAppMessage();
  const [confirmName, setConfirmName] = useState('');
  const navigate = useNavigate();

  const handleOpenChange = useCallback((visible: boolean) => {
    if (visible) {
      setConfirmName('');
    }
  }, []);

  const { loading, run: runDissolveGroup } = useRequest(
    async () => {
      const params: DeleteGroupRequest = { groupId: groupId! };
      await groupService.deleteGroup(params);
    },
    {
      manual: true,
      onSuccess: () => {
        message.success('已解散小组');
        setConfirmName('');
        onSuccess?.();
        onCancel();
        navigate('/app/my-group');
      },
      onError: (err) => {
        message.error(parseErrorMessage(err, '解散小组失败'));
      },
    }
  );

  const handleConfirm = () => {
    if (!groupId) {
      message.warning('小组ID不存在');
      return;
    }
    runDissolveGroup();
  };

  return (
    <Modal
      title="解散小组"
      open={open}
      onCancel={onCancel}
      afterOpenChange={handleOpenChange}
      destroyOnHidden
      footer={[
        <Button key="cancel" onClick={onCancel}>
          取消
        </Button>,
        <Button
          key="confirm"
          danger
          type="primary"
          onClick={handleConfirm}
          disabled={confirmName !== groupName}
          loading={loading}
        >
          解散
        </Button>,
      ]}
      width={400}
    >
      <Alert description="确定要解散小组吗？此操作不可撤销！" type="warning" showIcon />
      <div className={styles.modalSection}>
        <div className={styles.modalSectionLabel}>
          小组名称 <span className={styles.modalSectionSubLabel}>（{groupName}）</span>
        </div>
        <Input
          value={confirmName}
          onChange={(e) => setConfirmName(e.target.value)}
          placeholder={`请输入 "${groupName}" 以确认`}
        />
      </div>
    </Modal>
  );
};

export default DissolveGroupModal;
