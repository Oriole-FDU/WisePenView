import React, { useMemo } from 'react';
import { List, Avatar } from 'antd';
import type { GroupMember } from '@/types/group';
import type { SelectedMemberListProps } from './index.type';
import { ROLE_REVERSE_MAP } from '@/types/group';
import styles from './style.module.less';

const SelectedMemberList: React.FC<SelectedMemberListProps> = ({ members }) => {
  const formatDescription = (member: GroupMember) => {
    const parts = [];
    if (member.nickname) parts.push(member.nickname);
    const roleStr = member.role != null ? ROLE_REVERSE_MAP[member.role] : undefined;
    if (roleStr) parts.push(roleStr);
    return parts.join(' ') || undefined;
  };

  const dataSource = useMemo(() => members ?? [], [members]);

  if (!dataSource.length) return null;

  return (
    <div className={styles.wrapper}>
      <div className={styles.title}>选中成员 ({dataSource.length} 人)</div>
      <List
        dataSource={dataSource}
        renderItem={(member) => (
          <List.Item>
            <List.Item.Meta
              avatar={
                <Avatar src={member.avatar} alt={member.nickname || member.realname || '成员'}>
                  {(member.nickname || member.realname || '?').charAt(0).toUpperCase()}
                </Avatar>
              }
              title={member.realname}
              description={formatDescription(member)}
            />
          </List.Item>
        )}
        className={styles.list}
      />
    </div>
  );
};

export default SelectedMemberList;
