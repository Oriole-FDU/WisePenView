/** 详情页顶部互动信息展示条（只读，Note 与 PDF 详情页共用） */
import { Divider } from 'antd';
import { RiEyeLine, RiStarLine, RiThumbUpLine } from 'react-icons/ri';

import { formatReadCount } from '@/utils/format/formatNumber';
import type { ResourceInteractBarProps } from './index.type';
import styles from './style.module.less';

function ResourceInteractBar({ readCount, likeCount, scoreAvg }: ResourceInteractBarProps) {
  const scoreAvgText = scoreAvg != null ? `${scoreAvg.toFixed(1)} 分` : '暂无评分';
  const hasScoreAvg = scoreAvg != null;
  const showReadCount = readCount !== undefined;

  return (
    <div className={styles.interactBar}>
      {showReadCount && (
        <>
          <div className={styles.interactItem}>
            <RiEyeLine size={14} aria-hidden className={styles.interactIcon} />
            <span>{formatReadCount(readCount)}</span>
          </div>
          <Divider orientation="vertical" className={styles.interactDivider} />
        </>
      )}

      {/* 点赞量 */}
      <div className={styles.interactItem}>
        <RiThumbUpLine size={14} aria-hidden className={styles.interactIcon} />
        <span>{formatReadCount(likeCount)}</span>
      </div>

      <Divider orientation="vertical" className={styles.interactDivider} />

      {/* 平均分 */}
      <div className={styles.interactItem}>
        <RiStarLine
          size={14}
          aria-hidden
          className={hasScoreAvg ? styles.interactIcon : styles.interactIconMuted}
        />
        <span className={hasScoreAvg ? undefined : styles.noScore}>{scoreAvgText}</span>
      </div>
    </div>
  );
}

export default ResourceInteractBar;
