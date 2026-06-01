import { useGroupService } from '@/domains';
import type { DeleteGroupRequest } from '@/domains/Group';
import { parseErrorMessage } from '@/utils/error';
import { Button, toast } from '@heroui/react';
import { useRequest } from 'ahooks';
import { Alert, Input, Modal } from 'antd';
import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { DissolveGroupModalProps } from './index.type';

import styles from './index.module.less';

function DissolveGroupModal({
  open,
  onCancel,
  groupName,
  groupId,
  onSuccess,
}: DissolveGroupModalProps) {
  const groupService = useGroupService();
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
        toast.success('已解散小组');
        setConfirmName('');
        onSuccess?.();
        onCancel();
        navigate('/app/my-group');
      },
      onError: (err) => {
        toast.danger(parseErrorMessage(err));
      },
    }
  );

  const handleConfirm = () => {
    if (!groupId) {
      toast.warning('小组ID不存在');
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
        <Button key="cancel" onPress={onCancel}>
          取消
        </Button>,
        <Button
          key="confirm"
          variant="danger"
          onPress={handleConfirm}
          isDisabled={confirmName !== groupName || loading}
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
}

export default DissolveGroupModal;
