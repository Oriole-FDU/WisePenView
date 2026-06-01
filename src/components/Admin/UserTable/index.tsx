import type { AdminUser } from '@/domains/Admin';
import { IDENTITY, USER_STATUS } from '@/domains/User/enum';
import { Avatar, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useMemo } from 'react';
import type { AdminUserTableProps } from './index.type';
import styles from './style.module.less';

const EMPTY_TEXT = '-';

const formatOptionalText = (value?: string): string => {
  return value && value.trim() ? value : EMPTY_TEXT;
};

const getDisplayName = (user: AdminUser): string => {
  return user.realName || user.nickname || user.username || EMPTY_TEXT;
};

function AdminUserTable({
  users,
  loading = false,
  total,
  currentPage,
  pageSize,
  onPageChange,
  onRowClick,
}: AdminUserTableProps) {
  const columns = useMemo<ColumnsType<AdminUser>>(
    () => [
      {
        title: '用户',
        dataIndex: 'realName',
        key: 'user',
        width: 220,
        ellipsis: true,
        render: (_value, record) => (
          <div className={styles.userCell}>
            <Avatar size={32} src={record.avatar}>
              {getDisplayName(record).slice(0, 1)}
            </Avatar>
            <div className={styles.userMeta}>
              <div className={styles.primaryText}>{getDisplayName(record)}</div>
              <div className={styles.secondaryText}>{formatOptionalText(record.nickname)}</div>
            </div>
          </div>
        ),
      },
      {
        title: '用户名',
        dataIndex: 'username',
        key: 'username',
        width: 160,
        ellipsis: true,
        render: (value?: string) => formatOptionalText(value),
      },
      {
        title: '学工号',
        dataIndex: 'campusNo',
        key: 'campusNo',
        width: 140,
        ellipsis: true,
        render: (value?: string) => formatOptionalText(value),
      },
      {
        title: '身份',
        dataIndex: 'identityType',
        key: 'identityType',
        width: 96,
        render: (value: number) => <Tag>{IDENTITY.getLabel(value) || EMPTY_TEXT}</Tag>,
      },
      {
        title: '状态',
        dataIndex: 'status',
        key: 'status',
        width: 96,
        render: (value: number) => {
          const color = value === 1 ? 'success' : value === -2 ? 'error' : 'warning';
          return <Tag color={color}>{USER_STATUS.getLabel(value) || EMPTY_TEXT}</Tag>;
        },
      },
      {
        title: '邮箱',
        dataIndex: 'email',
        key: 'email',
        width: 220,
        ellipsis: true,
        render: (value?: string) => formatOptionalText(value),
      },
      {
        title: '创建时间',
        dataIndex: 'createTime',
        key: 'createTime',
        width: 180,
        ellipsis: true,
        render: (value?: string) => formatOptionalText(value),
      },
    ],
    []
  );

  return (
    <div className={styles.tableWrapper}>
      <Table<AdminUser>
        rowKey="id"
        size="small"
        loading={loading}
        columns={columns}
        dataSource={users}
        scroll={{ x: 1112 }}
        pagination={{
          total,
          current: currentPage,
          pageSize,
          showSizeChanger: true,
          showTotal: (value) => `共 ${value} 条`,
          onChange: onPageChange,
          onShowSizeChange: onPageChange,
        }}
        onRow={(record) => ({
          className: styles.clickableRow,
          onClick: () => onRowClick(record.id),
        })}
      />
    </div>
  );
}

export default AdminUserTable;
