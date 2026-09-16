import { ListBox } from '@heroui/react';
import { Plus, UserPlus } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom';

import { AppButton } from '@/components/base/Button';
import { Empty, Spin } from '@/components/base/Feedback';
import Select from '@/components/base/Input/Select';
import { useGroupService } from '@/domains';
import { GROUP_ROLE_FILTER_MAP, GROUP_TYPE } from '@/domains/Group';
import { useApi } from '@/hooks/useApi';
import PageHeader from '@/layouts/_common/PageHeader';
import {
  buildGroupFilesPath,
  buildGroupListPath,
  type GroupListRole,
  parseGroupListRouteQuery,
} from '@/utils/navigation/appRoute';

import { CreateGroupModal } from '../../group/_components/GroupModals';
import GroupCard from '../_components/GroupCard';
import PublicListPagination from '../_components/PublicListPagination';
import { JoinGroupModal } from '../_components/PublicModals';
import PublicSectionTabs from '../_components/PublicSectionTabs';
import styles from '../style.module.less';

function PublicGroupsPage() {
  const { t } = useTranslation('group');
  const groupService = useGroupService();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const query = parseGroupListRouteQuery(searchParams);
  const [joinModalOpen, setJoinModalOpen] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const roleFilter = GROUP_ROLE_FILTER_MAP[query.role];
  const { data, loading, error, refresh } = useApi(
    () =>
      groupService.fetchGroupList({
        groupRoleFilter: roleFilter,
        groupType: GROUP_TYPE.NORMAL,
        page: query.page,
        size: query.size,
      }),
    {
      refreshDeps: [query.role, query.page, query.size],
      loadingDelay: 160,
      getErrorMessage: () => t('list.loadFailed'),
    }
  );
  const groups = data?.groups ?? [];
  const total = data?.total ?? 0;
  const waitingForInitialData = data === undefined && !error && !loading;
  const canonicalPath = buildGroupListPath(query);
  const totalPages = Math.max(Math.ceil(total / query.size), 1);
  const boundedPath =
    data && query.page > totalPages
      ? buildGroupListPath({ ...query, page: totalPages })
      : undefined;

  const navigateWithQuery = (next: Partial<typeof query>, replace = false) => {
    navigate(buildGroupListPath({ ...query, ...next }), { replace });
  };

  const handleModalSuccess = () => {
    setCreateModalOpen(false);
    setJoinModalOpen(false);
    void refresh();
  };

  const roleItems = [
    { key: 'all', label: t('list.all') },
    { key: 'joined', label: t('list.joined') },
    { key: 'managed', label: t('list.managed') },
  ] satisfies Array<{ key: GroupListRole; label: string }>;

  if (`${location.pathname}${location.search}` !== canonicalPath) {
    return <Navigate to={canonicalPath} replace />;
  }
  if (boundedPath) return <Navigate to={boundedPath} replace />;

  return (
    <>
      <PageHeader
        title={t('list.title')}
        subtitle={t('list.subtitle')}
        actions={
          <div className={styles.actionsRow}>
            <AppButton variant="secondary" onPress={() => setCreateModalOpen(true)}>
              <Plus size={16} aria-hidden />
              {t('list.create')}
            </AppButton>
            <AppButton variant="primary" onPress={() => setJoinModalOpen(true)}>
              <UserPlus size={16} aria-hidden />
              {t('list.join')}
            </AppButton>
          </div>
        }
      />

      <div className={styles.listControls}>
        <PublicSectionTabs selectedKey="groups" />
        <Select
          aria-label={t('list.filterAria')}
          value={query.role}
          onChange={(value) => {
            if (typeof value === 'string') {
              navigateWithQuery({ role: value as GroupListRole, page: 1 });
            }
          }}
          className={styles.roleFilter}
        >
          <Select.Trigger>
            <Select.Value />
            <Select.Indicator />
          </Select.Trigger>
          <Select.Popover>
            <ListBox>
              {roleItems.map((item) => (
                <ListBox.Item key={item.key} id={item.key} textValue={item.label}>
                  {item.label}
                  <ListBox.ItemIndicator />
                </ListBox.Item>
              ))}
            </ListBox>
          </Select.Popover>
        </Select>
      </div>

      {waitingForInitialData ? (
        <div className={styles.loading} aria-hidden />
      ) : loading ? (
        <div className={styles.loading} role="status" aria-label={t('list.loading')}>
          <Spin size="large" />
        </div>
      ) : groups.length > 0 ? (
        <div className={styles.grid}>
          {groups.map((group) => (
            <div key={group.groupId} className={styles.gridItem}>
              <GroupCard
                group={group}
                onClick={() => navigate(buildGroupFilesPath(group.groupId))}
              />
            </div>
          ))}
        </div>
      ) : (
        <div className={styles.emptyState}>
          <Empty description={t('list.empty')} />
        </div>
      )}

      <PublicListPagination
        page={query.page}
        size={query.size}
        total={total}
        onChange={(page, size) => navigateWithQuery({ page, size })}
      />
      <JoinGroupModal
        isOpen={joinModalOpen}
        onOpenChange={setJoinModalOpen}
        onSuccess={handleModalSuccess}
      />
      <CreateGroupModal
        isOpen={createModalOpen}
        onOpenChange={setCreateModalOpen}
        onSuccess={handleModalSuccess}
      />
    </>
  );
}

export default PublicGroupsPage;
