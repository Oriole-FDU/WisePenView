import { useGroupService } from '@/domains';
import type { DeleteGroupRequest } from '@/domains/Group';
import { parseErrorMessage } from '@/utils/error';
import { Alert, Button, Input, Modal, TextField, toast } from '@heroui/react';
import { useRequest } from 'ahooks';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { DissolveGroupModalProps } from './index.type';

import styles from './index.module.less';

function DissolveGroupModal({
  isOpen,
  onOpenChange,
  groupName,
  groupId,
  onSuccess,
}: DissolveGroupModalProps) {
  const groupService = useGroupService();
  const [confirmName, setConfirmName] = useState('');
  const navigate = useNavigate();

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
        onOpenChange(false);
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

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      setConfirmName('');
      onOpenChange(true);
      return;
    }
    if (loading) return;
    setConfirmName('');
    onOpenChange(false);
  };

  return (
    <Modal isOpen={isOpen} onOpenChange={handleOpenChange}>
      <Modal.Backdrop isDismissable={!loading}>
        <Modal.Container size="sm" placement="center">
          <Modal.Dialog>
            <Modal.Header>
              <Modal.Heading>解散小组</Modal.Heading>
            </Modal.Header>
            <Modal.Body>
              <Alert status="warning">
                <Alert.Indicator />
                <Alert.Content>
                  <Alert.Description>确定要解散小组吗？此操作不可撤销！</Alert.Description>
                </Alert.Content>
              </Alert>
              <div className={styles.modalSection}>
                <div className={styles.modalSectionLabel}>
                  小组名称 <span className={styles.modalSectionSubLabel}>（{groupName}）</span>
                </div>
                <TextField aria-label="确认小组名称" value={confirmName} onChange={setConfirmName}>
                  <Input placeholder={`请输入 "${groupName}" 以确认`} />
                </TextField>
              </div>
            </Modal.Body>
            <Modal.Footer>
              <Button variant="secondary" isDisabled={loading} onPress={() => onOpenChange(false)}>
                取消
              </Button>
              <Button
                variant="danger"
                onPress={handleConfirm}
                isDisabled={confirmName !== groupName || loading}
              >
                解散
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}

export default DissolveGroupModal;
