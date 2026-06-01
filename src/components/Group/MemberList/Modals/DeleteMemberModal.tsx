import SelectedMemberList from '@/components/Common/SelectedMemberList';
import { useGroupService } from '@/domains';
import { parseErrorMessage } from '@/utils/error';
import { Button, Modal, toast } from '@heroui/react';
import { useRequest } from 'ahooks';
import type { DeleteMemberModalProps } from './index.type';
import { useMemberEditGuard } from './useMemberEditGuard';

function DeleteMemberModal({
  isOpen,
  onOpenChange,
  onSuccess,
  memberIds,
  members,
  groupId,
  groupDisplayConfig,
}: DeleteMemberModalProps) {
  const groupService = useGroupService();
  const { loading, run: runDeleteMembers } = useRequest(
    async () =>
      groupService.kickMembers({
        groupId,
        targetUserIds: memberIds,
      }),
    {
      manual: true,
      onSuccess: () => {
        toast.success(`已删除 ${memberIds.length} 位成员`);
        onSuccess?.();
        onOpenChange(false);
      },
      onError: (err) => {
        toast.danger(parseErrorMessage(err));
      },
    }
  );

  const { memberContainsOwner, canEdit, confirmDisabled } = useMemberEditGuard(
    members,
    groupDisplayConfig.editableRoles,
    { checkOwner: true }
  );

  const handleConfirm = () => {
    runDeleteMembers();
  };

  return (
    <Modal isOpen={isOpen} onOpenChange={onOpenChange}>
      <Modal.Backdrop isDismissable={!loading}>
        <Modal.Container size="md" placement="center">
          <Modal.Dialog>
            <Modal.Header>
              <Modal.Heading>删除成员</Modal.Heading>
            </Modal.Header>
            <Modal.Body>
              {memberContainsOwner ? (
                <div className="rounded-medium bg-danger/10 px-4 py-3 text-sm text-danger">
                  选中成员中有小组创建者，不可删除！
                </div>
              ) : !canEdit ? (
                <div className="rounded-medium bg-danger/10 px-4 py-3 text-sm text-danger">
                  您不能删除组长/管理员。
                </div>
              ) : (
                <div className="rounded-medium bg-warning/10 px-4 py-3 text-sm text-warning">
                  确定要删除以下成员吗？此操作不可撤销！
                </div>
              )}
              <SelectedMemberList members={members} />
            </Modal.Body>
            <Modal.Footer>
              <Button variant="secondary" isDisabled={loading} onPress={() => onOpenChange(false)}>
                取消
              </Button>
              <Button
                variant="danger"
                isDisabled={confirmDisabled || loading}
                onPress={() => void handleConfirm()}
              >
                删除
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}

export default DeleteMemberModal;
