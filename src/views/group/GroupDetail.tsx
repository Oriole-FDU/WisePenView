import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { Avatar, Button, Divider, Spin, message } from 'antd';
import { AiOutlineEdit, AiOutlineDelete, AiOutlineLogout } from 'react-icons/ai';
import MemberList from '@/components/Group/MemberList';
import { getPermissionConfig } from '@/components/Group/MemberList/PermissionConfig';
import {
  EditGroupInfoModal,
  DissolveGroupModal,
  ExitGroupModal,
} from '@/components/Group/GroupModals';
import { GroupServices } from '@/services/Group';
import type { Group } from '@/types/group';
import { GROUP_TYPE, getGroupTypeLabel } from '@/constants/group';
import styles from './style.module.less';

const GroupDetail: React.FC = () => {
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
        GroupServices.fetchGroupInfo(id),
        GroupServices.fetchMyRoleInGroup(id),
      ]);
      setGroup(groupData);
      setCurrentUserRole(role);
    } catch {
      message.error('获取小组详情失败');
      setGroup(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadGroup();
  }, [loadGroup]);

  const handleModalSuccess = () => {
    setEditGroupModalOpen(false);
    setDissolveGroupModalOpen(false);
    setExitGroupModalOpen(false);
    loadGroup();
  };

  const [editGroupModalOpen, setEditGroupModalOpen] = useState(false);
  const [dissolveGroupModalOpen, setDissolveGroupModalOpen] = useState(false);
  const [exitGroupModalOpen, setExitGroupModalOpen] = useState(false);

  const permissionConfig = useMemo(
    () => (group ? getPermissionConfig(getGroupTypeLabel(group.type), currentUserRole) : null),
    [group, currentUserRole]
  );

  if (loading) {
    return (
      <div className={styles.pageContainer} style={{ textAlign: 'center', padding: 60 }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!group) {
    return <div className={styles.pageContainer}>小组不存在</div>;
  }

  const { name: groupName, creator, description, coverUrl: cover, createTime } = group;
  const groupId = String(group.id ?? id ?? '');

  return (
    <div className={styles.pageContainer}>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>{groupName}</h1>
        <div className={styles.headerMeta}>
          {creator && (
            <div className={styles.headerMetaItem}>
              <Avatar size={24} src={creator.avatar} />
              <span>
                创建者：
                {group.type === GROUP_TYPE.NORMAL
                  ? creator.nickname
                  : creator.name || creator.nickname}
              </span>
            </div>
          )}
          <span>创建日期：{createTime ?? '暂无'}</span>
        </div>
      </div>

      <Divider />

      <div style={{ marginBottom: 24 }}>
        <h3 className={styles.sectionTitle}>小组描述</h3>
        <p className={styles.sectionContent}>{description || '暂无描述'}</p>
      </div>

      <Divider />

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

      <div className={styles.actionsBar}>
        {currentUserRole === 'OWNER' ? (
          <div className={styles.actionsRow}>
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
        onSuccess={handleModalSuccess}
      />
      <DissolveGroupModal
        open={dissolveGroupModalOpen}
        onCancel={() => setDissolveGroupModalOpen(false)}
        groupName={groupName}
        groupId={groupId}
        onSuccess={handleModalSuccess}
      />
      <ExitGroupModal
        open={exitGroupModalOpen}
        onCancel={() => setExitGroupModalOpen(false)}
        groupName={groupName}
        groupId={groupId}
        onSuccess={handleModalSuccess}
      />
    </div>
  );
};

export default GroupDetail;
