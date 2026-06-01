import { useGroupService } from '@/domains';
import type { QuitGroupRequest } from '@/domains/Group';
import { parseErrorMessage } from '@/utils/error';
import { Button, Modal, toast } from '@heroui/react';
import { useRequest } from 'ahooks';
import { useNavigate } from 'react-router-dom';
import type { ExitGroupModalProps } from './index.type';

import styles from './index.module.less';

function ExitGroupModal({
  isOpen,
  onOpenChange,
  groupName,
  groupId,
  onSuccess,
}: ExitGroupModalProps) {
  const groupService = useGroupService();
  const navigate = useNavigate();

  const { loading, run: runExitGroup } = useRequest(
    async () => {
      const params: QuitGroupRequest = { groupId: groupId! };
      await groupService.quitGroup(params);
    },
    {
      manual: true,
      onSuccess: () => {
        toast.success('已退出小组');
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
      toast.danger('小组ID不存在');
      return;
    }
    runExitGroup();
  };

  return (
    <Modal isOpen={isOpen} onOpenChange={onOpenChange}>
      <Modal.Backdrop isDismissable={!loading}>
        <Modal.Container size="sm" placement="center">
          <Modal.Dialog>
            <Modal.Header>
              <Modal.Heading>退出小组</Modal.Heading>
            </Modal.Header>
            <Modal.Body>
              <div className={styles.exitGroupName}>将要退出：{groupName}</div>
              <div className="rounded-medium bg-warning/10 px-4 py-3 text-sm text-warning">
                退出小组后，您将无法访问该小组的资源和历史数据，且需要重新邀请才能再次加入。
              </div>
            </Modal.Body>
            <Modal.Footer>
              <Button variant="secondary" isDisabled={loading} onPress={() => onOpenChange(false)}>
                取消
              </Button>
              <Button variant="danger" isDisabled={loading} onPress={() => void handleConfirm()}>
                确认退出
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}

export default ExitGroupModal;
