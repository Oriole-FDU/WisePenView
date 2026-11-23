import { type RefObject, useEffect, useState } from 'react';

import { FULL_WIDTH_MODEL_ICON_ONLY_MAX_WIDTH } from '@/constants/layoutScale';

/**
 * 全宽输入区按实宽决定模型按钮是否仅图标。
 * 窄宽布局直接返回 true，不观察尺寸。
 */
export function useCompactModelTrigger(
  fullWidth: boolean,
  inputCardRef: RefObject<HTMLElement | null>
): boolean {
  const [measuredCompact, setMeasuredCompact] = useState(false);

  /**
   * @wisepen-manual-effect
   * 执行时机：fullWidth 挂载后，以及输入卡片尺寸变化时。
   * 不可替代原因：模型按钮是否展示文案取决于输入区实宽，无法仅靠 fullWidth 判断。
   * cleanup：断开 ResizeObserver，并取消尚未执行的首帧测量。
   */
  useEffect(() => {
    const syncCompact = (width: number) => {
      setMeasuredCompact(width < FULL_WIDTH_MODEL_ICON_ONLY_MAX_WIDTH);
    };

    if (!fullWidth) return;

    const inputCard = inputCardRef.current;
    if (!inputCard || typeof ResizeObserver === 'undefined') {
      const frame = window.requestAnimationFrame(() => {
        syncCompact(inputCard?.getBoundingClientRect().width ?? window.innerWidth);
      });
      return () => window.cancelAnimationFrame(frame);
    }

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      syncCompact(entry.contentRect.width);
    });
    observer.observe(inputCard);
    return () => observer.disconnect();
  }, [fullWidth, inputCardRef]);

  return !fullWidth || measuredCompact;
}
