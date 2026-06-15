import { Eye, Star, ThumbsUp } from 'lucide-react';
/** 详情页顶部互动信息展示条（只读，Note 与 PDF 详情页共用） */
import { Separator } from '@heroui/react';
import { useRequest } from 'ahooks';

import { useResourceService } from '@/domains';
import { formatReadCount } from '@/utils/format/formatNumber';
import type { ResourceInteractBarProps } from './index.type';
import styles from './style.module.less';

function ResourceInteractBar({ resourceId }: ResourceInteractBarProps) {
  const resourceService = useResourceService();

  const { data } = useRequest(() => resourceService.getInteractStats(resourceId), {
    ready: Boolean(resourceId),
    refreshDeps: [resourceId],
  });

  if (!data) return null;

  const { readCount, likeCount, scoreAvgText } = data;
  const showReadCount = readCount !== undefined;

  return (
    <div className={styles.interactBar}>
      {showReadCount && (
        <>
          <div className={styles.interactItem}>
            <Eye size={14} aria-hidden className={styles.interactIcon} />
            <span>{formatReadCount(readCount)}</span>
          </div>
          <Separator orientation="vertical" className={styles.interactDivider} />
        </>
      )}

      {/* 点赞量 */}
      <div className={styles.interactItem}>
        <ThumbsUp size={14} aria-hidden className={styles.interactIcon} />
        <span>{formatReadCount(likeCount)}</span>
      </div>

      <Separator orientation="vertical" className={styles.interactDivider} />

      {/* 平均分 */}
      <div className={styles.interactItem}>
        <Star size={14} aria-hidden className={styles.interactIcon} />
        <span>{scoreAvgText}</span>
      </div>
    </div>
  );
}

export default ResourceInteractBar;
