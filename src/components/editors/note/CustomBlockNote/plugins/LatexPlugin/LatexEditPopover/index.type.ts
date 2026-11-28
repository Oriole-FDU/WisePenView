import type { RefObject } from 'react';

export interface LatexEditPopoverProps {
  /** 为 true 时挂载到 document.body */
  visible: boolean;
  position: { top: number; left: number; width: number } | null;
  /** 标题与 dialog 的 aria-label */
  title: string;
  hint: string;
  textareaClassName: string;
  value: string;
  onValueChange: (value: string) => void;
  onCommit: () => void;
  /** 点击浮层和锚点以外的区域时提交并收起。 */
  onOutsidePress: () => void;
  /**
   * true：仅 Enter（无 Shift）时提交，Shift+Enter 换行（块级多行）。
   * false：Enter / NumpadEnter 即提交（行内、不可换行）。
   */
  commitEnterUnlessShift: boolean;
  onCancel: () => void;
  onBlur: () => void;
  rows: number;
  inputRef: RefObject<HTMLTextAreaElement | null>;
  /** 浮层根节点，用于判断焦点和 pointerdown 是否仍在编辑区域内。 */
  rootRef: RefObject<HTMLDivElement | null>;
  /** 公式预览节点，用于将触发编辑的锚点视为编辑区域的一部分。 */
  anchorRef: RefObject<HTMLElement | null>;
}
