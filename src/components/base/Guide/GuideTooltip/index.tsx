import { CornerDownLeft } from 'lucide-react';
import type { ReactNode } from 'react';
import type { ArrowRenderProps } from 'react-joyride';

import type { GuideTooltipProps } from './index.type';
import styles from './style.module.scss';

const ARROW_OVERLAP = 2;

/** 三角底边伸进卡片，盖住边框，避免接缝处出现细线。 */
export function GuideArrow({ base, placement, size }: ArrowRenderProps) {
  const side = placement.split('-')[0];
  const overlap = ARROW_OVERLAP;
  let width = base;
  let height = size;
  let points = '';
  let outline = '';

  if (side === 'top') {
    height = size + overlap;
    points = `0,0 ${base / 2},${size + overlap} ${base},0`;
    outline = `M 0,0 L ${base / 2},${size + overlap} L ${base},0`;
  } else if (side === 'bottom') {
    height = size + overlap;
    points = `${base},${size + overlap} ${base / 2},0 0,${size + overlap}`;
    outline = `M ${base},${size + overlap} L ${base / 2},0 L 0,${size + overlap}`;
  } else if (side === 'left') {
    width = size + overlap;
    points = `0,0 ${size + overlap},${base / 2} 0,${base}`;
    outline = `M 0,0 L ${size + overlap},${base / 2} L 0,${base}`;
  } else if (side === 'right') {
    width = size + overlap;
    points = `${size + overlap},${base} ${size + overlap},0 0,${base / 2}`;
    outline = `M ${size + overlap},0 L 0,${base / 2} L ${size + overlap},${base}`;
  } else {
    return null;
  }

  const shift = side === 'top' ? styles.top : side === 'left' ? styles.left : '';

  return (
    <svg
      className={shift ? `${styles.arrow} ${shift}` : styles.arrow}
      width={width}
      height={height}
      aria-hidden="true"
    >
      <polygon className={styles.arrowFill} points={points} />
      <path className={styles.arrowStroke} d={outline} />
    </svg>
  );
}

function GuideTooltip({
  index,
  isLastStep,
  backProps,
  primaryProps,
  skipProps,
  step,
  tooltipProps,
}: GuideTooltipProps) {
  const showBack = step.buttons.includes('back') && index > 0;
  const showSkip = step.buttons.includes('skip') && !isLastStep;
  const showPrimary = step.buttons.includes('primary');
  const { children: primaryChildren, ...primaryButtonProps } =
    primaryProps as typeof primaryProps & {
      children?: ReactNode;
    };
  const primaryLabel = primaryChildren ?? primaryProps['aria-label'];
  const tooltipWidth = (step.data as { tooltipWidth?: string } | undefined)?.tooltipWidth;

  return (
    <div
      className={styles.tooltip}
      {...tooltipProps}
      style={tooltipWidth ? { width: tooltipWidth } : undefined}
      data-guide-tooltip=""
      data-react-aria-top-layer="true"
      onPointerDown={(event) => {
        // 模态弹层会在 document 上把外部按下当成失焦，需要阻止冒泡保住这次点击。
        event.stopPropagation();
      }}
    >
      {step.title ? <h2 className={styles.title}>{step.title}</h2> : null}
      <div className={styles.content}>{step.content}</div>
      <div className={styles.footer}>
        {showSkip ? <button type="button" className={styles.skip} {...skipProps} /> : <span />}
        <div className={styles.nav}>
          {showBack ? <button type="button" className={styles.back} {...backProps} /> : null}
          {showPrimary ? (
            <button
              type="button"
              className={styles.primary}
              aria-keyshortcuts={isLastStep ? undefined : 'Enter'}
              {...primaryButtonProps}
            >
              <span>{primaryLabel}</span>
              {isLastStep ? null : (
                <CornerDownLeft className={styles.enterIcon} size={14} aria-hidden="true" />
              )}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default GuideTooltip;
