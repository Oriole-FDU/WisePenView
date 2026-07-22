import { Skeleton } from '@heroui/react';
import clsx from 'clsx';
import type { MessageLoaderSkeletonProps } from './index.type';
import styles from './style.module.less';

function MessageLoaderSkeleton({ className }: MessageLoaderSkeletonProps) {
  return (
    <div
      className={clsx(styles.skeleton, className)}
      role="status"
      aria-live="polite"
      aria-label="正在生成回复"
    >
      <Skeleton animationType="shimmer" className={styles.skeletonLine} />
      <Skeleton animationType="shimmer" className={styles.skeletonLine} />
      <Skeleton animationType="shimmer" className={styles.skeletonLine} />
    </div>
  );
}

const MessageLoader = {
  Skeleton: MessageLoaderSkeleton,
};

export type { MessageLoaderSkeletonProps } from './index.type';
export default MessageLoader;
