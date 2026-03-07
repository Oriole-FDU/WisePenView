import React from 'react';
import { Card, Tag } from 'antd';
import type { GroupMember } from '@/types/group';
import { ROLE_LABEL } from '@/types/group';
import { getGroupTypeLabel } from '@/constants/group';
import PermissionConfigs, {
  PERMISSION_CONFIG_ENTRIES,
  type PermissionConfig,
} from '@/components/Group/MemberList/PermissionConfig';
import MemberList from '@/components/Group/MemberList';
import styles from './style.module.less';

/** 九张表共用的 mock 成员数据（与 API 结构一致） */
const MOCK_MEMBERS: GroupMember[] = [
  {
    userId: 1,
    realname: '张三',
    nickname: '阿三',
    role: 1,
    joinTime: '2024-01-15',
    avatar: '',
    used: 12000,
    limit: 50000,
  },
  {
    userId: 2,
    realname: '李四',
    nickname: '小李',
    role: 2,
    joinTime: '2024-02-20',
    avatar: '',
    used: 8000,
    limit: 30000,
  },
  {
    userId: 3,
    realname: '王五',
    nickname: '小王',
    role: 3,
    joinTime: '2024-03-10',
    avatar: '',
    used: 2000,
    limit: 10000,
  },
];

const PermissionConfigPreview: React.FC = () => {
  return (
    <div className={styles.pageContainer}>
      <h1 className={styles.pageTitle}>PermissionConfig 九种配置预览</h1>
      <p className={styles.pageSubtitle} style={{ marginBottom: 24 }}>
        组类型 × 当前用户角色 = 9 种表格展示
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
        {PERMISSION_CONFIG_ENTRIES.map(([groupType, userRole]) => {
          const config = PermissionConfigs[groupType]?.[userRole] as PermissionConfig;
          const title = `${getGroupTypeLabel(groupType)} - ${ROLE_LABEL[userRole] ?? userRole}`;

          return (
            <Card
              key={`${groupType}_${userRole}`}
              title={
                <span>
                  <Tag color="blue">{`${groupType}_${userRole}`}</Tag>
                  {title}
                </span>
              }
              extra={
                <span style={{ fontSize: 12, color: 'var(--ant-color-text-tertiary)' }}>
                  showRealName: {String(config.showRealName)} | showQuotas:{' '}
                  {String(config.showQuotas)} | 编辑: 修改权限
                  {config.canModifyPermission ? '✓' : '✗'} / 分配配额
                  {config.canAssignQuota ? '✓' : '✗'} / 删除
                  {config.canRemoveMember ? '✓' : '✗'}
                </span>
              }
              size="small"
            >
              <MemberList
                permissionConfig={config}
                groupId={`preview-${groupType}-${userRole}`}
                inviteCode="MOCK-INVITE"
                mockMembers={MOCK_MEMBERS}
                pagination={{
                  defaultPageSize: 10,
                  pageSizeOptions: [5, 10, 20, 50],
                  showSizeChanger: true,
                }}
              />
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default PermissionConfigPreview;
