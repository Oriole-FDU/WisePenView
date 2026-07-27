import AppAvatar from '@/components/Avatar';
import type { GroupMember } from '@/domains/Group';
import { ListBox, ListBoxItem } from '@heroui/react';
import { useTranslation } from 'react-i18next';
import type { SelectedMemberListProps } from './index.type';
import styles from './style.module.less';

function SelectedMemberList({ members, isReadOnly = true }: SelectedMemberListProps) {
  const { t } = useTranslation('group');
  const formatDescription = (member: GroupMember) => {
    const parts = [];
    if (member.nickname) parts.push(member.nickname);
    if (member.role) {
      const roleLabel =
        member.role === 'OWNER'
          ? t('member.role.owner')
          : member.role === 'ADMIN'
            ? t('member.role.admin')
            : t('member.role.member');
      parts.push(roleLabel);
    }
    return parts.join(' ') || undefined;
  };

  const dataSource = members ?? [];
  const disabledKeys = isReadOnly ? dataSource.map((member) => member.userId) : [];

  if (!dataSource.length) return null;

  return (
    <div className={styles.wrapper}>
      <div className={styles.title}>{t('member.selected.title', { count: dataSource.length })}</div>
      <ListBox
        aria-label={t('member.selected.aria')}
        selectionMode="none"
        disabledKeys={disabledKeys}
        className={styles.list}
      >
        {dataSource.map((member) => {
          const displayName = member.realname || member.nickname || t('member.fallbackName');
          const avatarText = displayName.charAt(0).toUpperCase();
          const description = formatDescription(member);

          return (
            <ListBoxItem
              key={member.userId}
              id={member.userId}
              textValue={displayName}
              isDisabled={isReadOnly}
              className={`${styles.memberItem} ${isReadOnly ? styles.memberItemReadOnly : ''}`}
            >
              <div className={styles.memberContent}>
                <AppAvatar aria-label={displayName} className={styles.avatar}>
                  {member.avatar && <AppAvatar.Image alt={displayName} src={member.avatar} />}
                  <AppAvatar.Fallback className={styles.avatarFallback}>
                    {avatarText}
                  </AppAvatar.Fallback>
                </AppAvatar>
                <div className={styles.memberInfo}>
                  <span className={styles.memberName}>{displayName}</span>
                  {description && <span className={styles.memberDescription}>{description}</span>}
                </div>
              </div>
            </ListBoxItem>
          );
        })}
      </ListBox>
    </div>
  );
}

export default SelectedMemberList;
