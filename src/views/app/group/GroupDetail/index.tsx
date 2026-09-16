import { Link, Tabs } from '@heroui/react';
import { linkVariants } from '@heroui/styles';
import { ArrowLeft, BookOpen, UserPlus } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link as RouterLink, Outlet, useMatch, useNavigate } from 'react-router-dom';

import { AppButton, AppIconButton } from '@/components/base/Button';
import { getGroupDisplayConfig } from '@/components/business/Group/GroupDisplayConfig';
import InviteUserModal from '@/components/business/Group/MemberList/Modals/InviteUserModal';
import { GROUP_TYPE } from '@/domains/Group';
import PageHeader from '@/layouts/_common/PageHeader';
import { useGroupContext } from '@/layouts/Group/GroupContext';
import {
  APP_ROUTE_PATH,
  buildCoursePath,
  buildGroupPath,
  type GroupRoutePage,
} from '@/utils/navigation/appRoute';
import underlineTabs from '@/views/app/_common/underlineTabs.module.less';

import page from './style.module.less';

export interface GroupDetailOutletContextValue {
  walletRefreshVersion: number;
  refreshWallet: () => void;
}

function GroupDetail() {
  const { t } = useTranslation('group');
  const { group, currentUserRole } = useGroupContext();
  const navigate = useNavigate();
  const [walletRefreshVersion, setWalletRefreshVersion] = useState(0);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const displayConfig = getGroupDisplayConfig(group.groupType, currentUserRole);
  const ownerName = group.ownerInfo?.realName?.trim() || group.ownerInfo?.nickname?.trim() || '-';
  const isFilesPage = useMatch(`${APP_ROUTE_PATH.GROUPS}/:groupId/files/*`) != null;
  const isMembersPage = useMatch(`${APP_ROUTE_PATH.GROUPS}/:groupId/members`) != null;
  const isWalletPage = useMatch(`${APP_ROUTE_PATH.GROUPS}/:groupId/wallet`) != null;
  const isTokenTransferPage = useMatch(`${APP_ROUTE_PATH.GROUPS}/:groupId/token-transfer`) != null;
  const isSettingsPage = useMatch(`${APP_ROUTE_PATH.GROUPS}/:groupId/settings`) != null;
  const activePage: GroupRoutePage = isFilesPage
    ? 'files'
    : isMembersPage
      ? 'members'
      : isWalletPage
        ? 'wallet'
        : isTokenTransferPage
          ? 'token-transfer'
          : isSettingsPage
            ? 'settings'
            : 'files';
  const tabs = [
    { key: 'files', label: t('detail.tabs.files') },
    { key: 'members', label: t('detail.tabs.members') },
    ...(displayConfig.showWalletTabs
      ? [
          { key: 'wallet' as const, label: t('detail.tabs.wallet') },
          { key: 'token-transfer' as const, label: t('detail.tabs.transfer') },
        ]
      : []),
    {
      key: 'settings' as const,
      label:
        group.groupType === GROUP_TYPE.ADVANCED
          ? t('detail.tabs.courseProfile')
          : t('detail.tabs.description'),
    },
  ] satisfies Array<{ key: GroupRoutePage; label: string }>;
  const containerClassName =
    activePage === 'files'
      ? `${page.detailPage} ${page.fixedPage}`
      : activePage === 'settings'
        ? `${page.detailPage} ${page.descriptionPage}`
        : page.detailPage;

  return (
    <div className={containerClassName}>
      <PageHeader
        leading={
          <AppIconButton
            icon={<ArrowLeft size={18} aria-hidden />}
            label={t('detail.backToGroups')}
            onPress={() => navigate(APP_ROUTE_PATH.GROUPS)}
            tooltip={{ placement: 'bottom' }}
          />
        }
        title={group.groupName}
        subtitle={
          <>
            <span>{t('detail.creator')}</span> {ownerName}
          </>
        }
        actions={
          <>
            {group.groupType === GROUP_TYPE.ADVANCED ? (
              <RouterLink
                className={`${linkVariants().base()} ${page.contextLink}`}
                to={buildCoursePath(group.groupId, 'home')}
              >
                <Link.Icon className={`${linkVariants().icon()} ${page.contextLinkIcon}`}>
                  <BookOpen aria-hidden />
                </Link.Icon>
                {t('detail.goToCourse')}
              </RouterLink>
            ) : null}
            {displayConfig.canInviteMember ? (
              <AppButton variant="primary" onPress={() => setIsInviteModalOpen(true)}>
                <UserPlus size={16} aria-hidden />
                {t('member.actions.invite')}
              </AppButton>
            ) : null}
          </>
        }
        actionsClassName={page.headerActions}
      />

      <Tabs
        variant="secondary"
        className={`${underlineTabs.underlineTabs} ${page.detailTabs}`}
        selectedKey={activePage}
        onSelectionChange={(key) => {
          const nextPage = tabs.find((item) => item.key === String(key))?.key;
          if (nextPage) navigate(buildGroupPath(group.groupId, nextPage));
        }}
      >
        <Tabs.ListContainer>
          <Tabs.List aria-label={t('detail.aria')}>
            {tabs.map((item) => (
              <Tabs.Tab key={item.key} id={item.key}>
                {item.label}
                <Tabs.Indicator />
              </Tabs.Tab>
            ))}
          </Tabs.List>
        </Tabs.ListContainer>
      </Tabs>

      <div className={page.tabContent}>
        <Outlet
          context={
            {
              walletRefreshVersion,
              refreshWallet: () => setWalletRefreshVersion((version) => version + 1),
            } satisfies GroupDetailOutletContextValue
          }
        />
      </div>
      <InviteUserModal
        isOpen={isInviteModalOpen}
        onOpenChange={setIsInviteModalOpen}
        inviteCode={group.inviteCode}
      />
    </div>
  );
}

export default GroupDetail;
