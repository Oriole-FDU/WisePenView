import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { Avatar, Button, Spin, Tabs } from 'antd';
import { AiOutlineEdit, AiOutlineDelete, AiOutlineLogout } from 'react-icons/ai';
import FlatDrive from '@/components/Drive/FlatDrive';
import MemberList from '@/components/Group/MemberList';
import { getPermissionConfig } from '@/components/Group/MemberList/PermissionConfig';
import {
  EditGroupInfoModal,
  DissolveGroupModal,
  ExitGroupModal,
} from '@/components/Group/GroupModals';
import { useGroupService } from '@/contexts/ServicesContext';
import type { Group } from '@/types/group';
import { GROUP_TYPE, getGroupTypeLabel } from '@/constants/group';
import layout from '../style.module.less';
import page from './style.module.less';
import { useAppMessage } from '@/hooks/useAppMessage';

const GroupDetail: React.FC = () => {
  const groupService = useGroupService();
  const message = useAppMessage();
  const { id } = useParams<{ id: string }>();
  const [group, setGroup] = useState<Group | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<'OWNER' | 'ADMIN' | 'MEMBER'>('MEMBER');
  const [loading, setLoading] = useState(true);

  const loadGroup = useCallback(async () => {
    if (!id) {
      setGroup(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [groupData, role] = await Promise.all([
        groupService.fetchGroupInfo(id),
        groupService.fetchMyRoleInGroup(id),
      ]);
      setGroup(groupData);
      setCurrentUserRole(role);
    } catch {
      message.error('获取小组详情失败');
      setGroup(null);
    } finally {
      setLoading(false);
    }
  }, [groupService, id, message]);

  useEffect(() => {
    loadGroup();
  }, [loadGroup]);

  /** 仅关闭弹窗；解散/退出后会 navigate 离开本页，不应再拉详情（否则多一次失败请求） */
  const handleModalCloseOnly = () => {
    setEditGroupModalOpen(false);
    setDissolveGroupModalOpen(false);
    setExitGroupModalOpen(false);
  };

  /** 编辑成功后留在详情页，需重新拉取小组与角色 */
  const handleEditSuccess = () => {
    handleModalCloseOnly();
    void loadGroup();
  };

  const [editGroupModalOpen, setEditGroupModalOpen] = useState(false);
  const [dissolveGroupModalOpen, setDissolveGroupModalOpen] = useState(false);
  const [exitGroupModalOpen, setExitGroupModalOpen] = useState(false);

  const permissionConfig = useMemo(
    () => (group ? getPermissionConfig(getGroupTypeLabel(group.groupType), currentUserRole) : null),
    [group, currentUserRole]
  );

  if (loading) {
    return (
      <div className={`${layout.pageContainer} ${page.loadingWrap}`}>
        <Spin size="large" />
      </div>
    );
  }

  if (!group) {
    return <div className={layout.pageContainer}>小组不存在</div>;
  }

  const { groupName, ownerInfo, groupDesc: description, groupCoverUrl: cover, createTime } = group;
  const groupId = group.groupId || id || '';

  return (
    <div className={layout.pageContainer}>
      <div className={layout.pageHeader}>
        <h1 className={layout.pageTitle}>{groupName}</h1>
        <div className={layout.headerMeta}>
          {ownerInfo && (
            <div className={layout.headerMetaItem}>
              <Avatar
                size={24}
                src={ownerInfo.avatar}
                alt={ownerInfo.nickname || ownerInfo.realName || '创建者'}
              >
                {(ownerInfo.nickname || ownerInfo.realName || '?').charAt(0).toUpperCase()}
              </Avatar>
              <span>
                创建者：
                {group.groupType === GROUP_TYPE.NORMAL
                  ? ownerInfo.nickname
                  : ownerInfo.realName || ownerInfo.nickname}
              </span>
            </div>
          )}
          <span>创建日期：{createTime ?? '暂无'}</span>
        </div>
      </div>

      <Tabs
        className={layout.detailTabs}
        items={[
          {
            key: 'files',
            label: '文件',
            children: (
              <div className={layout.tabPane}>
                <FlatDrive groupId={groupId} />
              </div>
            ),
          },
          {
            key: 'members',
            label: '成员列表',
            children: (
              <div className={layout.tabPane}>
                <MemberList
                  permissionConfig={permissionConfig!}
                  groupId={groupId}
                  inviteCode={group.inviteCode}
                  pagination={{
                    defaultPageSize: 10,
                    pageSizeOptions: [5, 10, 20, 50],
                    showSizeChanger: true,
                  }}
                />
              </div>
            ),
          },
          {
            key: 'description',
            label: '描述',
            children: (
              <div className={layout.tabPane}>
                <p className={layout.sectionContent}>{description || '暂无描述'}</p>
              </div>
            ),
          },
        ]}
      />

      <div className={layout.actionsBar}>
        {currentUserRole === 'OWNER' ? (
          <div className={layout.actionsRow}>
            <Button icon={<AiOutlineEdit size={16} />} onClick={() => setEditGroupModalOpen(true)}>
              编辑小组信息
            </Button>
            <Button
              danger
              icon={<AiOutlineDelete size={16} />}
              onClick={() => setDissolveGroupModalOpen(true)}
            >
              解散小组
            </Button>
          </div>
        ) : (
          <Button
            danger
            icon={<AiOutlineLogout size={16} />}
            onClick={() => setExitGroupModalOpen(true)}
          >
            退出小组
          </Button>
        )}
      </div>

      <EditGroupInfoModal
        open={editGroupModalOpen}
        onCancel={() => setEditGroupModalOpen(false)}
        groupName={groupName}
        description={description}
        cover={cover}
        groupId={groupId}
        groupType={group.groupType}
        onSuccess={handleEditSuccess}
      />
      <DissolveGroupModal
        open={dissolveGroupModalOpen}
        onCancel={() => setDissolveGroupModalOpen(false)}
        groupName={groupName}
        groupId={groupId}
        onSuccess={handleModalCloseOnly}
      />
      <ExitGroupModal
        open={exitGroupModalOpen}
        onCancel={() => setExitGroupModalOpen(false)}
        groupName={groupName}
        groupId={groupId}
        onSuccess={handleModalCloseOnly}
      />
    </div>
  );
};

export default GroupDetail;
