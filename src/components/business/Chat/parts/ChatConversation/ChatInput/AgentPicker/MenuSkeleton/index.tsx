import { Skeleton } from '@heroui/react';

import type { AgentMenuSkeletonProps } from './index.type';
import styles from './style.module.scss';

const AGENT_SKELETON_ROWS = [0, 1] as const;

function AgentMenuSkeleton({ ariaLabel }: AgentMenuSkeletonProps) {
  return (
    <div className={styles.popoverPanelAgentSkeleton} aria-busy="true" aria-label={ariaLabel}>
      <Skeleton className={styles.popoverSkeletonSection} />
      <div className={styles.popoverSkeletonList}>
        {AGENT_SKELETON_ROWS.map((row) => (
          <div key={row} className={styles.popoverSkeletonRow}>
            <Skeleton className={styles.popoverSkeletonIcon} />
            <Skeleton
              className={`${styles.popoverSkeletonLabel} ${row === 0 ? styles.popoverSkeletonLabelWide : ''}`}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

export default AgentMenuSkeleton;
