import { Avatar as HeroAvatar } from '@heroui/react';
import type { ComponentProps } from 'react';

import { cn } from '@/utils/cn';

import styles from './style.module.less';

type AppAvatarProps = ComponentProps<typeof HeroAvatar>;
type AppAvatarImageProps = ComponentProps<typeof HeroAvatar.Image>;

function AppAvatarRoot({ className, ...props }: AppAvatarProps) {
  return <HeroAvatar className={className} {...props} />;
}

function AppAvatarImage({ className, ...props }: AppAvatarImageProps) {
  return <HeroAvatar.Image className={cn(styles.image, className)} {...props} />;
}

const AppAvatar = Object.assign(AppAvatarRoot, {
  Fallback: HeroAvatar.Fallback,
  Image: AppAvatarImage,
  Root: AppAvatarRoot,
});

export type { AppAvatarImageProps, AppAvatarProps };
export default AppAvatar;
