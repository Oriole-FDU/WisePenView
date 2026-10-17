import { Chip, ListBox } from '@heroui/react';
import type { TFunction } from 'i18next';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { AppModal } from '@/components/base/AppModal';
import { AppButton } from '@/components/base/Button';
import { Input, Select } from '@/components/base/Input';
import { DataTable, type DataTableColumn } from '@/components/base/Table';
import { useAdminService } from '@/domains';
import type { AdminUser, GetAdminUserInfoResponse } from '@/domains/Admin';
import { IDENTITY, USER_STATUS } from '@/domains/User';
import { useApi } from '@/hooks/useApi';
import { formatTimestampToDateTime } from '@/utils/format/formatTime';
import AdminPageHeader from '@/views/admin/_common/AdminPageHeader';

import styles from '../style.module.less';
import pageStyles from './style.module.less';

const PAGE_SIZE_OPTIONS = [10, 20, 50];
const EMPTY_TEXT = '-';

const formatText = (value?: string | number | null): string => {
  if (value == null || String(value).trim() === '') return EMPTY_TEXT;
  return String(value);
};

const identityLabel = (value: number, t: TFunction): string =>
  t(`users.identity.${IDENTITY.getKey(value) ?? 'UNKNOWN'}`);

const statusLabel = (value: number, t: TFunction): string =>
  t(`users.status.${USER_STATUS.getKey(value) ?? 'UNKNOWN'}`);

function UserDetail({
  profile,
  t,
}: {
  profile: GetAdminUserInfoResponse['userProfile'];
  t: TFunction;
}) {
  const rows = [
    [t('users.detail.userId'), profile.userId],
    [t('users.detail.sex'), profile.sex == null ? undefined : t(`users.sex.${profile.sex}`)],
    [t('users.detail.university'), profile.university],
    [t('users.detail.college'), profile.college],
    [t('users.detail.major'), profile.major],
    [t('users.detail.className'), profile.className],
    [t('users.detail.enrollmentYear'), profile.enrollmentYear],
    [
      t('users.detail.degreeLevel'),
      profile.degreeLevel == null ? undefined : t(`users.degree.${profile.degreeLevel}`),
    ],
    [t('users.detail.academicTitle'), profile.academicTitle],
    [
      t('users.detail.createTime'),
      profile.createTime ? formatTimestampToDateTime(profile.createTime) : undefined,
    ],
    [
      t('users.detail.updateTime'),
      profile.updateTime ? formatTimestampToDateTime(profile.updateTime) : undefined,
    ],
  ];
  return (
    <dl className={pageStyles.detailList}>
      {rows.map(([label, value]) => (
        <div key={label} className={pageStyles.detailRow}>
          <dt>{label}</dt>
          <dd>{formatText(value)}</dd>
        </div>
      ))}
    </dl>
  );
}

function UserManagement() {
  const { t } = useTranslation(['admin', 'common']);
  const adminService = useAdminService();
  const [keyword, setKeyword] = useState('');
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState(0);
  const [identityType, setIdentityType] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const { data, loading, refresh } = useApi(
    () =>
      adminService.fetchUserList({
        page: currentPage,
        size: pageSize,
        keyword: query,
        status,
        identityType,
      }),
    { refreshDeps: [adminService, currentPage, pageSize, query, status, identityType] }
  );
  const { data: detail, loading: detailLoading } = useApi(
    () =>
      selectedUser
        ? adminService.getUserInfo({ userId: selectedUser.id })
        : Promise.resolve(undefined),
    { refreshDeps: [adminService, selectedUser], manual: !selectedUser }
  );

  const columns = [
    {
      id: 'username',
      label: t('users.column.username'),
      width: 'lg',
      isRowHeader: true,
      renderCell: (row: AdminUser) => (
        <DataTable.TextCell emphasis title={row.username}>
          {formatText(row.username)}
        </DataTable.TextCell>
      ),
    },
    {
      id: 'realName',
      label: t('users.column.realName'),
      width: 'md',
      renderCell: (row: AdminUser) => (
        <DataTable.TextCell>{formatText(row.realName || row.nickname)}</DataTable.TextCell>
      ),
    },
    {
      id: 'identityType',
      label: t('users.column.identity'),
      width: 'sm',
      renderCell: (row: AdminUser) => (
        <Chip size="sm" variant="soft">
          <Chip.Label>{identityLabel(row.identityType, t)}</Chip.Label>
        </Chip>
      ),
    },
    {
      id: 'status',
      label: t('users.column.status'),
      width: 'sm',
      renderCell: (row: AdminUser) => (
        <Chip size="sm" variant="soft">
          <Chip.Label>{statusLabel(row.status, t)}</Chip.Label>
        </Chip>
      ),
    },
    {
      id: 'campusNo',
      label: t('users.column.campusNo'),
      width: 'lg',
      renderCell: (row: AdminUser) => (
        <DataTable.TextCell>{formatText(row.campusNo)}</DataTable.TextCell>
      ),
    },
    {
      id: 'createTime',
      label: t('users.column.createTime'),
      width: 'lg',
      renderCell: (row: AdminUser) => (
        <DataTable.TextCell>{formatText(row.createTime)}</DataTable.TextCell>
      ),
    },
    {
      id: 'actions',
      label: t('users.column.actions'),
      width: 'sm',
      renderCell: (row: AdminUser) => (
        <AppButton
          variant="tertiary"
          size="sm"
          onPress={() => {
            setSelectedUser(row);
            setDetailOpen(true);
          }}
        >
          {t('users.view')}
        </AppButton>
      ),
    },
  ] satisfies DataTableColumn<AdminUser>[];

  const submitSearch = () => {
    setCurrentPage(1);
    setQuery(keyword.trim());
  };
  const handlePageChange = (page: number, size: number) => {
    setCurrentPage(page);
    setPageSize(size);
  };

  return (
    <div className={styles.pageContainer}>
      <AdminPageHeader page="users" />
      <DataTable<AdminUser>
        ariaLabel={t('users.tableAria')}
        rowKey="id"
        items={data?.users ?? []}
        loading={loading}
        columns={columns}
        title={t('users.tableTitle')}
        emptyText={t('users.empty')}
        className={pageStyles.userTable}
        maxBodyHeight={560}
        toolbar={
          <div className={pageStyles.toolbar}>
            <Input
              aria-label={t('users.searchLabel')}
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') submitSearch();
              }}
              placeholder={t('users.searchPlaceholder')}
              className={pageStyles.searchInput}
            />
            <Select
              aria-label={t('users.statusFilter')}
              value={String(status)}
              onChange={(value) => {
                if (value != null && !Array.isArray(value)) {
                  setStatus(Number(value));
                  setCurrentPage(1);
                }
              }}
              className={pageStyles.filterSelect}
            >
              <Select.Trigger />
              <Select.Popover>
                <ListBox>
                  {[0, USER_STATUS.NORMAL, USER_STATUS.UNVERIFIED, USER_STATUS.BANNED].map(
                    (value) => (
                      <ListBox.Item
                        key={value}
                        id={String(value)}
                        textValue={value === 0 ? t('users.all') : statusLabel(value, t)}
                      >
                        {value === 0 ? t('users.all') : statusLabel(value, t)}
                        <ListBox.ItemIndicator />
                      </ListBox.Item>
                    )
                  )}
                </ListBox>
              </Select.Popover>
            </Select>
            <Select
              aria-label={t('users.identityFilter')}
              value={String(identityType)}
              onChange={(value) => {
                if (value != null && !Array.isArray(value)) {
                  setIdentityType(Number(value));
                  setCurrentPage(1);
                }
              }}
              className={pageStyles.filterSelect}
            >
              <Select.Trigger />
              <Select.Popover>
                <ListBox>
                  {[0, IDENTITY.STUDENT, IDENTITY.TEACHER, IDENTITY.ADMIN].map((value) => (
                    <ListBox.Item
                      key={value}
                      id={String(value)}
                      textValue={value === 0 ? t('users.all') : identityLabel(value, t)}
                    >
                      {value === 0 ? t('users.all') : identityLabel(value, t)}
                      <ListBox.ItemIndicator />
                    </ListBox.Item>
                  ))}
                </ListBox>
              </Select.Popover>
            </Select>
            <AppButton variant="secondary" size="sm" onPress={submitSearch}>
              {t('users.search')}
            </AppButton>
            <AppButton
              variant="secondary"
              size="sm"
              isDisabled={loading}
              onPress={() => {
                void refresh();
              }}
            >
              {t('actions.refresh', { ns: 'common' })}
            </AppButton>
          </div>
        }
        pagination={{
          total: data?.total ?? 0,
          current: currentPage,
          pageSize,
          summary: t('users.total', { count: data?.total ?? 0 }),
          onChange: handlePageChange,
          pageSizeControl: (
            <Select
              aria-label={t('users.pageSizeAria')}
              value={String(pageSize)}
              onChange={(value) => {
                if (value != null && !Array.isArray(value)) handlePageChange(1, Number(value));
              }}
              className={pageStyles.pageSizeSelect}
            >
              <Select.Trigger />
              <Select.Popover>
                <ListBox>
                  {PAGE_SIZE_OPTIONS.map((value) => (
                    <ListBox.Item
                      key={value}
                      id={String(value)}
                      textValue={t('users.pageSize', { count: value })}
                    >
                      {t('users.pageSize', { count: value })}
                      <ListBox.ItemIndicator />
                    </ListBox.Item>
                  ))}
                </ListBox>
              </Select.Popover>
            </Select>
          ),
        }}
      />
      <AppModal
        isOpen={detailOpen}
        onOpenChange={setDetailOpen}
        title={
          selectedUser
            ? t('users.detail.title', { username: selectedUser.username })
            : t('users.detail.titleFallback')
        }
        size="sm"
      >
        {detailLoading ? (
          <div className={pageStyles.detailLoading}>{t('users.detail.loading')}</div>
        ) : detail ? (
          <UserDetail profile={detail.userProfile} t={t} />
        ) : (
          <div className={pageStyles.detailLoading}>{t('users.detail.empty')}</div>
        )}
      </AppModal>
    </div>
  );
}

export default UserManagement;
