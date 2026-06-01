/** 文档末尾互动区（Note 与 PDF 详情页通用）：大圆形点赞按钮 + 星级评分 */
import { useUnmount } from 'ahooks';
import React, { useCallback, useRef, useState } from 'react';
import { RiThumbUpFill, RiThumbUpLine } from 'react-icons/ri';

import Rating from '@/components/Common/Rating';
import type { ResourceInteractFooterProps } from './index.type';
import styles from './style.module.less';

/** 彩带粒子：角度(°)、飞出距离(px)、颜色、宽、高、圆角、延迟(ms) */
const BURST_PARTICLES = [
  { angle: -80, dist: 84, color: '#1677ff', w: 9, h: 9, r: '50%', delay: 0 },
  { angle: -60, dist: 76, color: '#faad14', w: 6, h: 14, r: '2px', delay: 15 },
  { angle: -40, dist: 90, color: '#52c41a', w: 9, h: 9, r: '50%', delay: 8 },
  { angle: -20, dist: 80, color: '#eb2f96', w: 6, h: 14, r: '2px', delay: 28 },
  { angle: 0, dist: 86, color: '#722ed1', w: 9, h: 9, r: '50%', delay: 4 },
  { angle: 20, dist: 78, color: '#fa8c16', w: 6, h: 14, r: '2px', delay: 22 },
  { angle: 40, dist: 88, color: '#13c2c2', w: 9, h: 9, r: '50%', delay: 12 },
  { angle: 60, dist: 82, color: '#f5222d', w: 6, h: 14, r: '2px', delay: 32 },
  { angle: 80, dist: 86, color: '#fadb14', w: 9, h: 9, r: '50%', delay: 6 },
  { angle: 100, dist: 76, color: '#36cfc9', w: 6, h: 14, r: '2px', delay: 18 },
  { angle: 120, dist: 90, color: '#ff85c0', w: 9, h: 9, r: '50%', delay: 26 },
  { angle: 140, dist: 82, color: '#95de64', w: 6, h: 14, r: '2px', delay: 10 },
  { angle: 160, dist: 84, color: '#1677ff', w: 9, h: 9, r: '50%', delay: 20 },
  { angle: -160, dist: 78, color: '#faad14', w: 6, h: 14, r: '2px', delay: 35 },
  { angle: -130, dist: 88, color: '#eb2f96', w: 9, h: 9, r: '50%', delay: 14 },
  { angle: -110, dist: 80, color: '#722ed1', w: 6, h: 14, r: '2px', delay: 30 },
] as const;

function ResourceInteractFooter({
  liked = false,
  userScore,
  onToggleLike,
  onRate,
  likeLoading = false,
  rateLoading = false,
}: ResourceInteractFooterProps) {
  const [bursting, setBursting] = useState(false);
  const burstTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /** 仅在「未赞 → 点赞」时触发彩带动效 */
  const handleLikeClick = useCallback(() => {
    if (!liked && !likeLoading) {
      if (burstTimer.current) clearTimeout(burstTimer.current);
      setBursting(true);
      burstTimer.current = setTimeout(() => setBursting(false), 900);
    }
    onToggleLike?.();
  }, [liked, likeLoading, onToggleLike]);

  useUnmount(() => {
    if (burstTimer.current) clearTimeout(burstTimer.current);
  });

  /** 评分提交回调 */
  const handleRateChange = useCallback(
    (score: number) => {
      onRate?.(score);
    },
    [onRate]
  );

  const rateHintText = userScore != null ? `已评 ${userScore} 分` : '为本资源评分';

  return (
    <div className={styles.footer}>
      {/* 点赞区 */}
      <div className={styles.likeSection}>
        <button
          type="button"
          className={[
            styles.likeBigBtn,
            liked ? styles.likeBigBtnActive : '',
            bursting ? styles.likeBigBtnPopping : '',
          ].join(' ')}
          onClick={handleLikeClick}
          disabled={likeLoading}
          aria-label={liked ? '取消点赞' : '点赞'}
          aria-pressed={liked}
        >
          <span className={styles.burstLayer} aria-hidden>
            {bursting &&
              BURST_PARTICLES.map((p, i) => {
                const rad = (p.angle * Math.PI) / 180;
                const tx = (Math.cos(rad) * p.dist).toFixed(1);
                const ty = (Math.sin(rad) * p.dist).toFixed(1);
                return (
                  <span
                    key={i}
                    className={styles.burstParticle}
                    style={
                      {
                        width: p.w,
                        height: p.h,
                        borderRadius: p.r,
                        background: p.color,
                        animationDelay: `${p.delay}ms`,
                        '--tx': `${tx}px`,
                        '--ty': `${ty}px`,
                        '--rot': `${(i * 53 + 20) % 360}deg`,
                      } as React.CSSProperties
                    }
                  />
                );
              })}
          </span>
          {liked ? (
            <RiThumbUpFill key="fill" size={16} className={styles.likeBtnIcon} aria-hidden />
          ) : (
            <RiThumbUpLine key="line" size={16} className={styles.likeBtnIcon} aria-hidden />
          )}
        </button>
        <span className={styles.interactLabel}>{liked ? '你已赞' : '真诚点赞，手留余香'}</span>
      </div>

      {/* 评分区 */}
      <div className={styles.rateSection}>
        <div className={styles.rateWrap}>
          <Rating
            value={userScore ?? 0}
            isDisabled={rateLoading}
            ariaLabel="为本资源评分"
            onValueChange={handleRateChange}
          />
        </div>
        <span className={styles.interactLabel}>{rateHintText}</span>
      </div>
    </div>
  );
}

export default ResourceInteractFooter;
