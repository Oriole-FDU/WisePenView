/**
 * 小组详情的展示和操作入口由组类型与当前用户角色配置驱动。
 */
import TableDrive from '@/components/Drive/TableDrive';
import { Spin } from '@/components/Feedback';
import type { SegmentedTabItem } from '@/components/SegmentedTabs';
import SegmentedTabs from '@/components/SegmentedTabs';
import UserCapsule from '@/components/UserCapsule';
import { useGroupService } from '@/domains';
import type { Group, GroupResConfig } from '@/domains/Group';
import { WALLET_TARGET_TYPE } from '@/domains/Wallet';
import SidebarDriveScopeSwitcher from '@/layouts/_common/Sidebar/DriveSidebar/_components/SidebarDrive/SidebarDriveScopeSwitcher';
import { parseDriveInitialNodeId } from '@/utils/navigation/driveRoute';
import ComputeWallet from '@/views/app/_common/Wallet/ComputeWallet';
import { toast } from '@heroui/react';
import { useRequest } from 'ahooks';
import type { ReactNode } from 'react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useParams } from 'react-router-dom';
import { getGroupDisplayConfig } from '../_components/GroupDisplayConfig';
import MemberList from '../_components/MemberList';
import OwnerGroupTokenTransfer from '../_components/OwnerGroupTokenTransfer';
import layout from '../style.module.less';
import GroupDescriptionSettings from './_components/GroupDescriptionSettings';
import page from './style.module.less';

type GroupDetailLoaded = {
  group: Group;
  currentUserRole: 'OWNER' | 'ADMIN' | 'MEMBER';
  resConfig: GroupResConfig;
};

type GroupDetailTabKey = 'files' | 'members' | 'wallet' | 'token-transfer' | 'description';

type GroupDetailTabItem = SegmentedTabItem<GroupDetailTabKey> & {
  children: ReactNode;
};

function GroupDetail() {
  const { t } = useTranslation('group');
  const groupService = useGroupService();
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const initialNodeId = parseDriveInitialNodeId(location.search);

  const { loading, data, refresh } = useRequest(
    async (): Promise<GroupDetailLoaded> => {
      const [groupData, role, resConfig] = await Promise.all([
        groupService.fetchGroupInfo(id!),
        groupService.fetchMyRoleInGroup(id!),
        groupService.fetchGroupResConfig(id!),
      ]);
      return { group: groupData, currentUserRole: role, resConfig };
    },
    {
      refreshDeps: [id],
      ready: Boolean(id),
      onError: () => {
        toast.danger(t('detail.loadFailed'));
      },
    }
  );

  // 解包 data, 默认 currentUserRole 为 MEMBER
  const { group, currentUserRole = 'MEMBER', resConfig } = data ?? {};

  const groupDisplayConfig = (() => {
    if (!group) {
      return null;
    }
    return getGroupDisplayConfig(group.groupType, currentUserRole);
  })();

  const [walletRefreshVersion, setWalletRefreshVersion] = useState(0);

  /** Tabs 受控，避免 items 更新时重置当前选中的 Tab */
  const [detailTabKey, setDetailTabKey] = useState<GroupDetailTabKey>('files');

  /**
   * Tab 配置必须在任意 early return 之前计算，以符合 Hooks 规则。
   * group/groupDisplayConfig 为空时返回空数组（加载中或无效态不会渲染到 Tab）。
   */
  const tabItems = (() => {
    if (!group || !resConfig || !groupDisplayConfig) {
      return [];
    }

    const gid = group.groupId || id || '';
    const items: GroupDetailTabItem[] = [
      {
        key: 'files',
        label: t('detail.tabs.files'),
        children: (
          <div className={`${layout.tabPane} ${page.fileTabPane}`}>
            <TableDrive
              scope={{ type: 'group', groupId: gid }}
              breadcrumbExtra={<SidebarDriveScopeSwitcher />}
              initialNodeId={initialNodeId}
              actions={{
                toolbar: {
                  canCreateFolder: groupDisplayConfig.canCreateTag,
                  canCreateNote: groupDisplayConfig.canCreateResource,
                  canCreateDrawio: groupDisplayConfig.canCreateResource,
                  canCreateSkill: groupDisplayConfig.canCreateResource,
                  canCreateAgent: groupDisplayConfig.canCreateResource,
                  canUploadToGroup: groupDisplayConfig.canUploadToGroup,
                  canManageTagPermission: groupDisplayConfig.canManageTag,
                },
              }}
            />
          </div>
        ),
      },
      {
        key: 'members',
        label: t('detail.tabs.members'),
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
        label: t('detail.tabs.wallet'),
        children: (
          <div className={layout.tabPane}>
            <ComputeWallet
              targetType={WALLET_TARGET_TYPE.GROUP}
              targetId={gid}
              canRecharge={false}
              showOperatorColumn
              refreshVersion={walletRefreshVersion}
            />
          </div>
        ),
      });
      items.push({
        key: 'token-transfer',
        label: t('detail.tabs.transfer'),
        children: (
          <div className={layout.tabPane}>
            <OwnerGroupTokenTransfer
              groupId={gid}
              onTransferSuccess={() => {
                setWalletRefreshVersion((version) => version + 1);
              }}
            />
          </div>
        ),
      });
    }

    items.push({
      key: 'description',
      label: t('detail.tabs.description'),
      children: (
        <GroupDescriptionSettings
          key={gid}
          group={group}
          groupId={gid}
          groupResConfig={resConfig}
          currentUserRole={currentUserRole}
          onRefresh={() => void refresh()}
        />
      ),
    });

    return items;
  })() satisfies GroupDetailTabItem[];

  const detailTabKeys = tabItems.map((item) => item.key);

  const handleDetailTabChange = (nextKey: GroupDetailTabKey) => {
    if (detailTabKeys.includes(nextKey)) {
      setDetailTabKey(nextKey);
    }
  };

  const activeDetailTabKey =
    detailTabKeys.length > 0 && !detailTabKeys.includes(detailTabKey)
      ? (detailTabKeys[0] ?? 'files')
      : detailTabKey;
  const activeTabContent = tabItems.find((item) => item.key === activeDetailTabKey)?.children;

  // 渲染 UI
  if (loading) {
    return (
      <div className={`${layout.pageContainer} ${page.loadingWrap}`}>
        <Spin size="large" />
      </div>
    );
  }

  if (!group) {
    return <div className={layout.pageContainer}>{t('detail.notFound')}</div>;
  }

  const { groupName, ownerInfo, createTime } = group;
  const ownerName = ownerInfo?.nickname?.trim() || '-';

  return (
    <div
      className={
        activeDetailTabKey === 'files' || activeDetailTabKey === 'description'
          ? `${layout.pageContainer} ${page.fixedPage}`
          : layout.pageContainer
      }
    >
      <div className={layout.pageHeaderWithActions}>
        <div>
          <h1 className={layout.pageTitle}>{groupName}</h1>
          <div className={layout.headerMeta}>
            {ownerInfo && (
              <div className={layout.headerMetaItem}>
                <span>{t('detail.creator')}</span>
                <UserCapsule name={ownerName} avatar={ownerInfo.avatar} />
              </div>
            )}
            <span>{t('detail.createdAt', { date: createTime ?? t('detail.noDate') })}</span>
          </div>
        </div>
      </div>

      <SegmentedTabs<GroupDetailTabKey>
        ariaLabel={t('detail.aria')}
        className={layout.detailTabs}
        selectedKey={activeDetailTabKey}
        onSelectionChange={handleDetailTabChange}
        items={tabItems.map(({ key, label, disabled }) => ({ key, label, disabled }))}
      />
      <div className={page.tabContent}>{activeTabContent}</div>
    </div>
  );
}

export default GroupDetail;
