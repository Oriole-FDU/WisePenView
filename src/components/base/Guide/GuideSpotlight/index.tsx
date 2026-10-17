import { useId } from 'react';
import { createPortal } from 'react-dom';

import type { GuideSpotlightProps } from './index.type';
import styles from './style.module.less';
import { useGuideSpotlightFrame } from './useGuideSpotlightFrame';

const SPOTLIGHT_FEATHER = 1;

/** 引导遮罩：为当前步骤需要说明的区域挖出柔边高亮孔。 */
function GuideSpotlight({ toolIds, padding, radius, zIndex }: GuideSpotlightProps) {
  const frame = useGuideSpotlightFrame(toolIds, padding, radius);
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const maskId = `guide-spotlight-mask-${id}`;
  const featherId = `guide-spotlight-feather-${id}`;

  if (frame.rects.length === 0) return null;

  return createPortal(
    <div className={styles.spotlight} style={{ zIndex }} aria-hidden="true">
      <svg
        className={styles.spotlightSvg}
        viewBox={`0 0 ${frame.width} ${frame.height}`}
        preserveAspectRatio="none"
      >
        <defs>
          <filter
            id={featherId}
            x="-100%"
            y="-100%"
            width="300%"
            height="300%"
            colorInterpolationFilters="sRGB"
          >
            <feGaussianBlur stdDeviation={SPOTLIGHT_FEATHER} />
          </filter>
          <mask
            id={maskId}
            x={0}
            y={0}
            width={frame.width}
            height={frame.height}
            maskUnits="userSpaceOnUse"
            maskContentUnits="userSpaceOnUse"
          >
            <rect x={0} y={0} width={frame.width} height={frame.height} fill="white" />
            {frame.rects.map((rect, index) => (
              <rect
                key={index}
                x={rect.left}
                y={rect.top}
                width={rect.width}
                height={rect.height}
                rx={rect.radius}
                fill="black"
                filter={`url(#${featherId})`}
              />
            ))}
          </mask>
        </defs>
        <rect
          className={styles.spotlightPath}
          x={0}
          y={0}
          width={frame.width}
          height={frame.height}
          mask={`url(#${maskId})`}
        />
      </svg>
    </div>,
    document.body
  );
}

export default GuideSpotlight;
