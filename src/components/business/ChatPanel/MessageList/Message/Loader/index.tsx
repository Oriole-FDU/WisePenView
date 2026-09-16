import { Skeleton } from '@heroui/react';
import { useTranslation } from 'react-i18next';

import { cn } from '@/utils/cn';

import type { MessageLoaderSkeletonProps } from './index.type';
import styles from './style.module.less';

function MessageLoaderSkeleton({ className }: MessageLoaderSkeletonProps) {
  const { t } = useTranslation('chat');
  return (
    <div
      className={cn(styles.skeleton, className)}
      role="status"
      aria-live="polite"
      aria-label={t('message.generating')}
    >
      <Skeleton animationType="shimmer" className={styles.skeletonLine} />
      <Skeleton animationType="shimmer" className={styles.skeletonLine} />
      <Skeleton animationType="shimmer" className={styles.skeletonLine} />
    </div>
  );
}

export type { MessageLoaderSkeletonProps } from './index.type';
export default MessageLoaderSkeleton;
