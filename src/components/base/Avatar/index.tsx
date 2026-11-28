import { Avatar as HeroAvatar } from '@heroui/react';
import { clsx } from 'clsx';

import type { AppAvatarImageProps, AppAvatarProps } from './index.type';
import styles from './style.module.scss';

function AppAvatarRoot({ className, ...props }: AppAvatarProps) {
  return <HeroAvatar className={className} {...props} />;
}

function AppAvatarImage({ className, ...props }: AppAvatarImageProps) {
  return <HeroAvatar.Image className={clsx(styles.image, className)} {...props} />;
}

const AppAvatar = Object.assign(AppAvatarRoot, {
  Fallback: HeroAvatar.Fallback,
  Image: AppAvatarImage,
  Root: AppAvatarRoot,
});

export type { AppAvatarImageProps, AppAvatarProps };
export default AppAvatar;
