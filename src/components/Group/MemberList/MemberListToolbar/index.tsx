import IconText from '@/components/Common/IconText';
import { Button } from '@heroui/react';

import { AiOutlineDelete } from 'react-icons/ai';
import { RiMoneyDollarCircleLine, RiUserLine } from 'react-icons/ri';
import type { MemberListToolbarProps } from './index.type';
import styles from './style.module.less';

function MemberListToolbar({
  isEditMode,
  total,
  groupDisplayConfig,
  selectedCount,
  onModifyPermission,
  onAssignQuota,
  onDelete,
  onToggleEditMode,
  onInviteUser,
}: MemberListToolbarProps) {
  if (isEditMode) {
    return (
      <div className={styles.toolbarEdit}>
        <div className={styles.toolbarEditContent}>
          <div className={styles.toolbarEditContentLeft}>
            {groupDisplayConfig.canModifyPermission && (
              <Button onPress={onModifyPermission} isDisabled={selectedCount === 0}>
                <IconText icon={<RiUserLine />} iconSize={16}>
                  修改权限
                </IconText>
              </Button>
            )}
            {groupDisplayConfig.canAssignQuota && (
              <Button onPress={onAssignQuota} isDisabled={selectedCount === 0}>
                <IconText icon={<RiMoneyDollarCircleLine />} iconSize={16}>
                  分配配额
                </IconText>
              </Button>
            )}
            {groupDisplayConfig.canRemoveMember && (
              <Button variant="danger" onPress={onDelete} isDisabled={selectedCount === 0}>
                <IconText icon={<AiOutlineDelete />} iconSize={16}>
                  删除成员
                </IconText>
              </Button>
            )}
          </div>
          <Button onPress={onToggleEditMode}>取消编辑</Button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.toolbarDefault}>
      <span className={styles.toolbarDefaultText}>共 {total} 人</span>
      <div className={styles.toolbarDefaultButtons}>
        {groupDisplayConfig.canEnterEditMode && (
          <Button onPress={onToggleEditMode}>管理用户</Button>
        )}
        {groupDisplayConfig.canInviteMember && (
          <Button variant="primary" onPress={onInviteUser}>
            邀请用户
          </Button>
        )}
      </div>
    </div>
  );
}

export default MemberListToolbar;
