/**
 * 小组详情：展示/ Tab / 小组盘只读等由 getGroupDisplayConfig（如 showWalletTabs、driveReadOnlyMode）驱动。
 */
import React, { useState, useMemo, useRef, useCallback } from 'react';
import { useRequest } from 'ahooks';
import { useParams } from 'react-router-dom';
import { Avatar, Button, Spin, Tabs } from 'antd';
import type { TabsProps } from 'antd';
import { AiOutlineEdit, AiOutlineDelete, AiOutlineLogout } from 'react-icons/ai';
import { getGroupDisplayConfig } from '@/components/Group/GroupDisplayConfig';
import FolderDrive from '@/components/Drive/TreeDrive/FolderDrive';
import TagDrive from '@/components/Drive/TreeDrive/TagDrive';
import MemberList from '@/components/Group/MemberList';
import {
  EditGroupInfoModal,
  DissolveGroupModal,
  ExitGroupModal,
} from '@/components/Group/GroupModals';
import ComputeWallet from '@/components/Wallet/ComputeWallet';
import OwnerGroupTokenTransfer from '@/components/Group/OwnerGroupTokenTransfer';
import { useGroupService } from '@/contexts/ServicesContext';
import type { Group } from '@/types/group';
import { GROUP_TYPE } from '@/constants/group';
import { WALLET_TARGET_TYPE } from '@/constants/wallet';
import layout from '../style.module.less';
import page from './style.module.less';
import { useAppMessage } from '@/hooks/useAppMessage';
import type { GroupResConfig } from '@/types/group';
import type { ComputeWalletRef } from '@/components/Wallet/ComputeWallet/index.type';

type GroupDetailLoaded = {
  group: Group;
  currentUserRole: 'OWNER' | 'ADMIN' | 'MEMBER';
  resConfig: GroupResConfig;
};

const GroupDetail: React.FC = () => {
  const groupService = useGroupService();
  const message = useAppMessage();
  const { id } = useParams<{ id: string }>();

  const { loading, data, refresh } = useRequest(
    async (): Promise<GroupDetailLoaded> => {
      const [groupData, role, cfg] = await Promise.all([
        groupService.fetchGroupInfo(id!),
        groupService.fetchMyRoleInGroup(id!),
        groupService.fetchGroupResConfig(id!),
      ]);
      return { group: groupData, currentUserRole: role, resConfig: cfg };
    },
    {
      refreshDeps: [id],
      ready: Boolean(id),
      onError: () => {
        message.error('获取小组详情失败');
      },
    }
  );

  // 解包 data, 默认 currentUserRole 为 MEMBER, resConfig 为 undefined
  const { group, currentUserRole = 'MEMBER', resConfig } = data ?? {};

  const groupDisplayConfig = useMemo(() => {
    if (!group) {
      return null;
    }
    return getGroupDisplayConfig(group.groupType, currentUserRole);
  }, [group, currentUserRole]);

  /** 仅关闭弹窗；解散/退出后会 navigate 离开本页，不应再拉详情（否则多一次失败请求） */
  const handleModalCloseOnly = () => {
    setEditGroupModalOpen(false);
    setDissolveGroupModalOpen(false);
    setExitGroupModalOpen(false);
  };

  /** 编辑成功后留在详情页，需重新拉取小组与角色 */
  const handleEditSuccess = () => {
    handleModalCloseOnly();
    void refresh();
  };

  const [editGroupModalOpen, setEditGroupModalOpen] = useState(false);
  const [dissolveGroupModalOpen, setDissolveGroupModalOpen] = useState(false);
  const [exitGroupModalOpen, setExitGroupModalOpen] = useState(false);
  const walletRef = useRef<ComputeWalletRef | null>(null);
  const handleTransferSuccess = useCallback(() => {
    void walletRef.current?.refresh();
  }, []);

  /** Tabs 受控，避免 items 更新时重置当前选中的 Tab */
  const [detailTabKey, setDetailTabKey] = useState<string>('files');

  /**
   * Tabs 配置必须在任意 early return 之前计算，以符合 Hooks 规则。
   * group/groupDisplayConfig 为空时返回空数组（加载中或无效态不会渲染到 Tabs）。
   */
  const tabItems = useMemo<NonNullable<TabsProps['items']>>(() => {
    if (!group || !resConfig || !groupDisplayConfig) {
      return [];
    }

    const gid = group.groupId || id || '';
    const items: NonNullable<TabsProps['items']> = [
      {
        key: 'files',
        label: '文件',
        children: (
          <div className={layout.tabPane}>
            {resConfig.fileOrgLogic === 'FOLDER' ? (
              <FolderDrive
                groupId={gid}
                readOnlyMode={groupDisplayConfig.driveReadOnlyMode}
                allowUpload={!groupDisplayConfig.driveReadOnlyMode}
                fileOrgLogic={resConfig.fileOrgLogic}
              />
            ) : (
              <TagDrive groupId={gid} readOnlyMode={groupDisplayConfig.driveReadOnlyMode} />
            )}
          </div>
        ),
      },
      {
        key: 'members',
        label: '成员列表',
        children: (
          <div className={layout.tabPane}>
            <MemberList
              groupDisplayConfig={groupDisplayConfig}
              groupId={gid}
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
    ];

    if (groupDisplayConfig.showWalletTabs) {
      items.push({
        key: 'wallet',
        label: 'token 明细',
        children: (
          <div className={layout.tabPane}>
            <ComputeWallet
              targetType={WALLET_TARGET_TYPE.GROUP}
              targetId={gid}
              canRecharge
              groupDisplayName={group.groupName}
              showOperatorColumn
              ref={walletRef}
            />
          </div>
        ),
      });
      items.push({
        key: 'token-transfer',
        label: 'token 划拨',
        children: (
          <div className={layout.tabPane}>
            <OwnerGroupTokenTransfer groupId={gid} onTransferSuccess={handleTransferSuccess} />
          </div>
        ),
      });
    }

    items.push({
      key: 'description',
      label: '描述',
      children: (
        <div className={layout.tabPane}>
          <p className={layout.sectionContent}>{group.groupDesc || '暂无描述'}</p>
        </div>
      ),
    });

    return items;
  }, [group, id, groupDisplayConfig, resConfig, handleTransferSuccess]);

  const detailTabKeys = useMemo(() => tabItems.map((item) => String(item.key)), [tabItems]);

  const handleDetailTabChange = (nextKey: string) => {
    if (detailTabKeys.includes(nextKey)) {
      setDetailTabKey(nextKey);
    }
  };

  const activeDetailTabKey =
    detailTabKeys.length > 0 && !detailTabKeys.includes(detailTabKey)
      ? (detailTabKeys[0] ?? 'files')
      : detailTabKey;

  // 渲染 UI
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
        activeKey={activeDetailTabKey}
        onChange={handleDetailTabChange}
        items={tabItems}
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
