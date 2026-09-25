import AppAvatar from '@/components/base/Avatar';

import type { UserCapsuleProps } from './index.type';
import styles from './style.module.less';

function UserCapsule({ name, avatar, variant = 'bare' }: UserCapsuleProps) {
  const displayName = name.trim() || '-';
  const avatarText = displayName === '-' ? '?' : displayName.charAt(0).toUpperCase();

  return (
    <span className={`${styles.userCapsule} ${styles[variant]}`}>
      <AppAvatar aria-label={displayName} className={styles.avatar}>
        {avatar && <AppAvatar.Image alt={displayName} src={avatar} />}
        <AppAvatar.Fallback className={styles.avatarFallback}>{avatarText}</AppAvatar.Fallback>
      </AppAvatar>
      <span className={styles.name}>{displayName}</span>
    </span>
  );
}

export default UserCapsule;
