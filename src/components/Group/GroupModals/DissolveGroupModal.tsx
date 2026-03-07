import React, { useState, useEffect } from 'react';
import { Modal, Button, Input, Alert, message } from 'antd';
import { useNavigate } from 'react-router-dom';
import { GroupServices } from '@/services/Group';
import type { DeleteGroupRequest } from '@/services/Group';
import { toNumberIds } from '@/utils/number';
import type { DissolveGroupModalProps } from './index.type';
import styles from './style.module.less';

const DissolveGroupModal: React.FC<DissolveGroupModalProps> = ({
  open,
  onCancel,
  groupName,
  groupId,
  onSuccess,
}) => {
  const [loading, setLoading] = useState(false);
  const [confirmName, setConfirmName] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    if (open) setConfirmName('');
  }, [open]);

  const handleConfirm = async () => {
    if (!groupId) {
      message.error('解散失败');
      return;
    }
    try {
      setLoading(true);
      const params: DeleteGroupRequest = { groupId: toNumberIds(groupId) };
      await GroupServices.deleteGroup(params);
      message.success('已解散小组');
      setConfirmName('');
      onSuccess?.();
      onCancel();
      navigate('/app/my-group');
    } catch (error) {
      console.error('解散小组失败:', error);
      message.error('解散小组失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title="解散小组"
      open={open}
      onCancel={onCancel}
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
