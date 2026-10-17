import type { Placement, Step } from 'react-joyride';

import type { GuideStepPlacement, GuideTourConfig } from '@/constants/tour';

import { findGuideTarget } from './findGuideTarget';
import type { GuideActionPort } from './guideActions';

const VIEWPORT_PADDING = 12;

/** 给定一侧放不下时，改到对面，避免卡片伸出窗口。 */
function oppositePlacement(placement: GuideStepPlacement): Placement {
  if (placement === 'left') return 'right';
  if (placement === 'top') return 'bottom';
  if (placement === 'bottom') return 'top';
  return 'left';
}

function readOffset(element: HTMLElement): { x: number; y: number } | null {
  const transform = element.style.transform;
  const translated = /translate(?:3d)?\(\s*(-?\d+(?:\.\d+)?)px,\s*(-?\d+(?:\.\d+)?)px/.exec(
    transform
  );
  if (translated) return { x: Number(translated[1]), y: Number(translated[2]) };
  const x = Number.parseFloat(element.style.left);
  const y = Number.parseFloat(element.style.top);
  if (Number.isFinite(x) && Number.isFinite(y)) return { x, y };
  return null;
}

/** 气泡和箭头的外接矩形。绝对定位的箭头不计入父元素的布局盒。 */
function paintedBounds(element: HTMLElement): {
  left: number;
  top: number;
  right: number;
  bottom: number;
} {
  const rect = element.getBoundingClientRect();
  let left = rect.left;
  let top = rect.top;
  let right = rect.right;
  let bottom = rect.bottom;
  for (const node of element.querySelectorAll('*')) {
    if (!(node instanceof HTMLElement)) continue;
    const child = node.getBoundingClientRect();
    if (child.width === 0 && child.height === 0) continue;
    left = Math.min(left, child.left);
    top = Math.min(top, child.top);
    right = Math.max(right, child.right);
    bottom = Math.max(bottom, child.bottom);
  }
  return { left, top, right, bottom };
}

function nudgeIntoView(
  position: number,
  start: number,
  end: number,
  min: number,
  max: number
): number {
  if (start < min) return position + (min - start);
  if (end > max) return position - (end - max);
  return position;
}

/**
 * 按屏幕上真正画出的位置把气泡夹进可视区域。
 * 坐标夹紧只对 fixed 的主轴有效，贴边目标仍会把另一侧切出窗口。
 */
function stayInViewport(state: {
  x: number;
  y: number;
  rects: { floating: { width: number; height: number } };
  elements: { floating: HTMLElement | null };
}): { x: number; y: number } {
  const floating = state.elements.floating;
  const width = state.rects.floating.width;
  const height = state.rects.floating.height;
  const maxX = window.innerWidth - VIEWPORT_PADDING;
  const maxY = window.innerHeight - VIEWPORT_PADDING;
  if (!floating || width === 0 || height === 0) {
    return {
      x: Math.min(Math.max(state.x, VIEWPORT_PADDING), Math.max(VIEWPORT_PADDING, maxX - width)),
      y: Math.min(Math.max(state.y, VIEWPORT_PADDING), Math.max(VIEWPORT_PADDING, maxY - height)),
    };
  }

  const current = readOffset(floating);
  const rect = floating.getBoundingClientRect();
  if (!current || rect.width === 0) {
    return {
      x: Math.min(Math.max(state.x, VIEWPORT_PADDING), Math.max(VIEWPORT_PADDING, maxX - width)),
      y: Math.min(Math.max(state.y, VIEWPORT_PADDING), Math.max(VIEWPORT_PADDING, maxY - height)),
    };
  }

  const bounds = paintedBounds(floating);
  const nextLeft = bounds.left + (state.x - current.x);
  const nextTop = bounds.top + (state.y - current.y);
  const nextRight = bounds.right + (state.x - current.x);
  const nextBottom = bounds.bottom + (state.y - current.y);
  return {
    x: nudgeIntoView(state.x, nextLeft, nextRight, VIEWPORT_PADDING, maxX),
    y: nudgeIntoView(state.y, nextTop, nextBottom, VIEWPORT_PADDING, maxY),
  };
}

/** 把指引配置编译成 Joyride 步骤。步骤数组要保持引用稳定，避免播放中被打回起点。 */
export function compileGuideSteps(
  tour: GuideTourConfig,
  translate: (key: string) => string,
  actions: GuideActionPort
): Step[] {
  return tour.steps.map((step) => {
    const prepare = step.prepare;
    const restore = step.restore;
    const spotlightToolIds = step.spotlightToolIds ?? [];
    const singleSpotlightToolId = spotlightToolIds.length === 1 ? spotlightToolIds[0] : null;
    return {
      id: step.id,
      target: () => findGuideTarget(step.toolId),
      title: translate(step.titleKey),
      content: translate(step.contentKey),
      placement: step.placement,
      skipScroll: true,
      // Joyride 会把默认 tooltip 样式合并进 step.styles，宽度经 data 透传，避免覆盖组件样式。
      ...(step.tooltipWidth ? { data: { tooltipWidth: step.tooltipWidth } } : {}),
      ...(singleSpotlightToolId
        ? { spotlightTarget: () => findGuideTarget(singleSpotlightToolId) }
        : {}),
      hideOverlay: true,
      ...(step.offset !== undefined ? { offset: step.offset } : {}),
      floatingOptions: {
        strategy: 'fixed',
        // 目标可能只改变位置而不改变尺寸；逐帧同步才能跟住响应式布局并正确复原气泡。
        autoUpdate: { animationFrame: true },
        ...(step.preventFlip === false
          ? {
              flipOptions: false,
            }
          : step.preventFlip
            ? {
                flipOptions: {
                  padding: VIEWPORT_PADDING,
                  fallbackPlacements: [oppositePlacement(step.placement ?? 'right')],
                },
              }
            : {}),
        shiftOptions: {
          padding: VIEWPORT_PADDING,
          mainAxis: true,
          crossAxis: true,
          boundary: 'clippingAncestors',
          rootBoundary: 'viewport',
        },
        middleware: [{ name: 'stayInViewport', fn: stayInViewport }],
      },
      ...(prepare ? { before: async () => actions.prepare(prepare) } : {}),
      ...(restore ? { after: () => actions.restore(restore, step.id) } : {}),
    };
  });
}
