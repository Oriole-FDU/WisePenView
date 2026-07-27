import { useEffect, type RefObject } from 'react';

/**
 * 浮层已算出位置后，下一帧聚焦 textarea 并将选区移到末尾（行内 / 块级公式编辑共用）。
 */
export function useFocusPopoverTextarea(
  isEditing: boolean,
  popoverPos: { top: number; left: number; width: number } | null,
  inputRef: RefObject<HTMLTextAreaElement | null>
): void {
  /**
   * @wisepen-manual-effect
   * 执行时机：公式浮层完成定位且进入编辑态后，在下一帧聚焦输入框。
   * 不可替代原因：焦点与文本选区属于浏览器 DOM 状态，只能在提交后命令式设置。
   * cleanup：取消尚未执行的 animation frame，避免过期浮层抢占焦点。
   */
  useEffect(() => {
    if (!isEditing || popoverPos === null) return;
    const id = window.requestAnimationFrame(() => {
      const el = inputRef.current;
      if (!el) return;
      // 浮层重定位（如预览尺寸变化）会多次触发该 effect。
      // 若 textarea 已处于激活状态，不应重置光标位置，避免输入中“跳到末尾”。
      if (document.activeElement === el) {
        return;
      }
      el.focus();
      const len = el.value.length;
      el.setSelectionRange(len, len);
    });
    return () => window.cancelAnimationFrame(id);
  }, [isEditing, popoverPos, inputRef]);
}
