import { useEffect, useRef, useState } from 'react';

/**
 * 对布尔标志做平滑处理：
 * - flag 变为 true 后延迟 showDelay ms 才返回 true（期间恢复则取消）
 * - 一旦返回 true，至少保持 minShowDuration ms 后才允许回落为 false
 */
export function useSmoothFlag(flag: boolean, showDelay: number, minShowDuration: number): boolean {
  const [visible, setVisible] = useState(false);
  const visibleRef = useRef(false);
  const showTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const shownAtRef = useRef(0);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  /**
   * @wisepen-manual-effect
   * 执行时机：flag 或展示时序参数变化时重新安排显隐计时。
   * 不可替代原因：setTimeout 是 React 外部计时器，需要随最新输入启动或取消。
   * cleanup：清除本轮尚未执行的显示、隐藏计时器，避免过期回调修改状态。
   */
  useEffect(() => {
    clearTimeout(showTimerRef.current);
    clearTimeout(hideTimerRef.current);

    if (flag) {
      if (!visibleRef.current) {
        showTimerRef.current = setTimeout(() => {
          shownAtRef.current = Date.now();
          visibleRef.current = true;
          setVisible(true);
        }, showDelay);
      }
    } else if (visibleRef.current) {
      const elapsed = Date.now() - shownAtRef.current;
      const remaining = Math.max(0, minShowDuration - elapsed);
      hideTimerRef.current = setTimeout(() => {
        visibleRef.current = false;
        setVisible(false);
      }, remaining);
    }

    return () => {
      clearTimeout(showTimerRef.current);
      clearTimeout(hideTimerRef.current);
    };
  }, [flag, minShowDuration, showDelay]);

  return visible;
}
