import React, { useState } from 'react';
import { Modal, Button, Alert } from 'antd';
import { useNavigate } from 'react-router-dom';
import { useGroupService } from '@/contexts/ServicesContext';
import type { QuitGroupRequest } from '@/services/Group';
import type { ExitGroupModalProps } from './index.type';
import styles from './style.module.less';
import { useAppMessage } from '@/hooks/useAppMessage';

const ExitGroupModal: React.FC<ExitGroupModalProps> = ({
  open,
  onCancel,
  groupName,
  groupId,
  onSuccess,
}) => {
  const groupService = useGroupService();
  const message = useAppMessage();
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleConfirm = async () => {
    if (!groupId) {
      message.error('小组ID不存在');
      return;
    }
    try {
      setLoading(true);
      const params: QuitGroupRequest = { groupId };
      await groupService.quitGroup(params);
      message.success('已退出小组');
      onSuccess?.();
      onCancel();
      navigate('/app/my-group');
    } catch (error) {
      console.error('退出小组失败:', error);
      message.error('退出小组失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title="退出小组"
      open={open}
      onCancel={onCancel}
      destroyOnHidden
      footer={[
        <Button key="cancel" onClick={onCancel}>
          取消
        </Button>,
        <Button key="confirm" danger type="primary" onClick={handleConfirm} loading={loading}>
          确认退出
        </Button>,
      ]}
      width={500}
    >
      <div className={styles.exitGroupName}>将要退出：{groupName}</div>
      <Alert
        description="退出小组后，您将无法访问该小组的资源和历史数据，且需要重新邀请才能再次加入。"
        type="warning"
        showIcon
      />
    </Modal>
  );
};

export default ExitGroupModal;
