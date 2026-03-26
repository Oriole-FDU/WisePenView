/** 与 InlineMath / MathBlock 浮层定位共用的几何计算（不含 React） */

export const LATEX_POPOVER_MARGIN = 8;
export const LATEX_POPOVER_RAF_MAX_RETRIES = 30;

/** 插件刚插入节点时首帧 rect 常为 0，不可用于定位 */
export function isLatexPopoverAnchorMeasurable(r: DOMRect): boolean {
  return r.width >= 2 && r.height >= 2;
}

export interface LatexPopoverPlacementOptions {
  minWidth: number;
  maxWidth: number;
  estHeight: number;
  /** 默认 {@link LATEX_POPOVER_MARGIN} */
  margin?: number;
}

export interface LatexPopoverPlacement {
  top: number;
  left: number;
  width: number;
}

/**
 * 根据锚点矩形计算 fixed 浮层位置：宽度夹在 [minWidth, maxWidth]，水平贴边防溢出，垂直优先向下否则向上。
 */
export function computeLatexPopoverPlacement(
  r: DOMRect,
  options: LatexPopoverPlacementOptions
): LatexPopoverPlacement {
  const margin = options.margin ?? LATEX_POPOVER_MARGIN;
  const { minWidth, maxWidth, estHeight } = options;
  const width = Math.min(maxWidth, Math.max(minWidth, r.width || minWidth));
  const left = Math.max(margin, Math.min(r.left, window.innerWidth - width - margin));
  let top = r.bottom + 8;
  if (top + estHeight > window.innerHeight - margin) {
    top = Math.max(margin, r.top - estHeight - 8);
  }
  return { top, left, width };
}
