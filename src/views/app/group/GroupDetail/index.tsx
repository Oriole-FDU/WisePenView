/**
 * 小组详情：展示/ Tab / 小组盘只读等由 getGroupDisplayConfig（如 showWalletTabs、driveReadOnlyMode）驱动。
 */
import IconText from '@/components/Common/IconText';
import UserCapsule from '@/components/Common/UserCapsule';
import TableDrive from '@/components/Drive/TableDrive';
import { getGroupDisplayConfig } from '@/components/Group/GroupDisplayConfig';
import {
  DissolveGroupModal,
  EditGroupInfoModal,
  ExitGroupModal,
} from '@/components/Group/GroupModals';
import MemberList from '@/components/Group/MemberList';
import OwnerGroupTokenTransfer from '@/components/Group/OwnerGroupTokenTransfer';
import ComputeWallet from '@/components/Wallet/ComputeWallet';
import type { ComputeWalletRef } from '@/components/Wallet/ComputeWallet/index.type';
import { useGroupService } from '@/domains';
import type { Group, GroupResConfig } from '@/domains/Group';
import { WALLET_TARGET_TYPE } from '@/domains/Wallet';
import { Button, toast } from '@heroui/react';
import { useRequest } from 'ahooks';
import type { TabsProps } from 'antd';
import { Spin, Tabs } from 'antd';
import { useCallback, useMemo, useRef, useState } from 'react';
import { AiOutlineDelete, AiOutlineEdit, AiOutlineLogout } from 'react-icons/ai';
import { useParams } from 'react-router-dom';
import layout from '../style.module.less';
import page from './style.module.less';

type GroupDetailLoaded = {
  group: Group;
  currentUserRole: 'OWNER' | 'ADMIN' | 'MEMBER';
  resConfig: GroupResConfig;
};

function GroupDetail() {
  const groupService = useGroupService();
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
        toast.danger('获取小组详情失败');
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
            <TableDrive
              scope={{ type: 'group', groupId: gid }}
              actions={{
                toolbar: {
                  canCreateFolder: groupDisplayConfig.canCreateTag,
                  canUploadToGroup: true,
                  canManageTagPermission: groupDisplayConfig.canManageTag,
                },
                row: {
                  canRename: groupDisplayConfig.canCreateTag,
                  canDelete: groupDisplayConfig.canCreateTag,
                  canMove: groupDisplayConfig.canCreateTag,
                  canManageNodePermission: groupDisplayConfig.canManageTag,
                },
              }}
            />
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
              canRecharge={false}
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
  const ownerName = ownerInfo?.nickname?.trim() || '-';

  return (
    <div className={layout.pageContainer}>
      <div className={layout.pageHeader}>
        <h1 className={layout.pageTitle}>{groupName}</h1>
        <div className={layout.headerMeta}>
          {ownerInfo && (
            <div className={layout.headerMetaItem}>
              <span>创建者：</span>
              <UserCapsule name={ownerName} avatar={ownerInfo.avatar} />
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
            <Button onPress={() => setEditGroupModalOpen(true)}>
              <IconText icon={<AiOutlineEdit />} iconSize={16}>
                编辑小组信息
              </IconText>
            </Button>
            <Button variant="danger" onPress={() => setDissolveGroupModalOpen(true)}>
              <IconText icon={<AiOutlineDelete />} iconSize={16}>
                解散小组
              </IconText>
            </Button>
          </div>
        ) : (
          <Button variant="danger" onPress={() => setExitGroupModalOpen(true)}>
            <IconText icon={<AiOutlineLogout />} iconSize={16}>
              退出小组
            </IconText>
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
        isOpen={exitGroupModalOpen}
        onOpenChange={(open) => setExitGroupModalOpen(open)}
        groupName={groupName}
        groupId={groupId}
        onSuccess={handleModalCloseOnly}
      />
    </div>
  );
}

export default GroupDetail;
