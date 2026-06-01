import QuotaBar from '@/components/Common/QuotaBar';
import type { GroupDisplayConfig } from '@/components/Group/GroupDisplayConfig';
import type { GroupMember } from '@/domains/Group';
import { ROLE } from '@/domains/Group';
import type { EnumKey } from '@/utils/enum';
import { formatTimestampToDate } from '@/utils/format/formatTime';
import type { TableColumnsType } from 'antd';
import { Avatar, Badge } from 'antd';
import React from 'react';

type MemberRecord = GroupMember & { key: React.Key };

const getBadgeColor = (role: EnumKey<typeof ROLE>): string => {
  switch (role) {
    case 'OWNER':
      return 'gold';
    case 'ADMIN':
      return 'blue';
    case 'MEMBER':
      return 'gray';
    default:
      return '';
  }
};

export const getColumns = (
  groupDisplayConfig: GroupDisplayConfig,
  styles: Record<string, string>
): TableColumnsType<MemberRecord> => {
  const columns: TableColumnsType<MemberRecord> = [
    {
      key: 'badge',
      title: '',
      dataIndex: 'role',
      width: 64,
      align: 'center',
      render: (role: EnumKey<typeof ROLE>) => (
        <Badge color={getBadgeColor(role)} className={styles.badgeItem} />
      ),
    },
    {
      key: 'avatar',
      title: '头像',
      dataIndex: 'avatar',
      width: 80,
      render: (avatar: string, record: MemberRecord) => {
        const displayName = record.nickname?.trim() || record.realname?.trim() || '?';
        const avatarSrc = avatar?.trim() || undefined;
        return (
          <Avatar src={avatarSrc} alt={displayName}>
            {displayName.charAt(0).toUpperCase()}
          </Avatar>
        );
      },
    },
    {
      key: 'realname',
      title: '姓名',
      dataIndex: 'realname',
      width: 140,
      render: (realname: string) => (
        <span className={styles.nameItem}>{realname.trim() === '' ? '-' : realname}</span>
      ),
      sorter: (a, b) => (a.realname || '').localeCompare(b.realname || '', 'zh-CN'),
    },
    {
      key: 'nickname',
      title: '昵称',
      dataIndex: 'nickname',
      width: 140,
      render: (nickname: string) => (
        <span className={styles.nicknameItem}>
          {nickname ? (nickname.trim() === '' ? '-' : nickname) : '-'}
        </span>
      ),
      sorter: (a, b) => (a.nickname ?? '').localeCompare(b.nickname ?? '', 'zh-CN'),
    },
    {
      key: 'role',
      title: '角色',
      dataIndex: 'role',
      width: 120,
      render: (role: EnumKey<typeof ROLE>) => (
        <span className={styles.roleItem}>{ROLE.keyLabels[role] ?? role}</span>
      ),
      sorter: (a, b) => (ROLE[a.role] ?? 0) - (ROLE[b.role] ?? 0),
    },
    {
      key: 'joinTime',
      title: '加入时间',
      dataIndex: 'joinTime',
      width: 150,
      render: (joinTime: string) => (
        <span className={styles.joinTimeItem}>{formatTimestampToDate(joinTime) || '-'}</span>
      ),
      sorter: (a, b) =>
        (a.joinTime ? new Date(a.joinTime).getTime() : 0) -
        (b.joinTime ? new Date(b.joinTime).getTime() : 0),
    },
    {
      key: 'quota',
      title: '配额使用',
      dataIndex: 'used',
      align: 'center',
      width: 300,
      render: (_: number, record: MemberRecord) => (
        <div className={styles.quotaItem}>
          <QuotaBar used={record.used ?? 0} limit={record.limit ?? 0} />
        </div>
      ),
      sorter: (a, b) => (a.used ?? 0) - (b.used ?? 0),
    },
  ];

  const filteredColumns = columns.filter((col) => {
    if (col.key === 'realname' && !groupDisplayConfig.showRealName) return false;
    if (col.key === 'quota' && !groupDisplayConfig.showQuotas) return false;
    return true;
  });

  if (filteredColumns.length > 0) {
    const lastIndex = filteredColumns.length - 1;
    filteredColumns[lastIndex] = {
      ...filteredColumns[lastIndex],
      width: undefined,
      ellipsis: true,
    };
  }

  return filteredColumns;
};
