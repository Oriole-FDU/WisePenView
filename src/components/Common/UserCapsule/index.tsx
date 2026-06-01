import { Avatar } from '@heroui/react';

import type { UserCapsuleProps } from './index.type';
import styles from './style.module.less';

function UserCapsule({ name, avatar, variant = 'bare' }: UserCapsuleProps) {
  const displayName = name.trim() || '-';
  const avatarText = displayName === '-' ? '?' : displayName.charAt(0).toUpperCase();

  return (
    <span className={`${styles.userCapsule} ${styles[variant]}`}>
      <Avatar aria-label={displayName} className={styles.avatar}>
        {avatar && <Avatar.Image alt={displayName} src={avatar} />}
        <Avatar.Fallback className={styles.avatarFallback}>{avatarText}</Avatar.Fallback>
      </Avatar>
      <span className={styles.name}>{displayName}</span>
    </span>
  );
}

export default UserCapsule;
