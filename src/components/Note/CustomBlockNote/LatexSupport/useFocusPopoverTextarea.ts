import { type RefObject, useEffect } from 'react';

/**
 * 浮层已算出位置后，下一帧聚焦 textarea 并将选区移到末尾（行内 / 块级公式编辑共用）。
 */
export function useFocusPopoverTextarea(
  isEditing: boolean,
  popoverPos: { top: number; left: number; width: number } | null,
  inputRef: RefObject<HTMLTextAreaElement | null>
): void {
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
