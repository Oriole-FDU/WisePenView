import { useLayoutEffect, useRef, useState } from 'react';

import type { GuideSpotlightPadding, GuideToolId } from '@/constants/tour';

import { findGuideTarget } from '../findGuideTarget';
import type { GuideSpotlightFrame } from './index.type';

/** 所有引导目标统一小幅外扩，兼顾内容贴合和按钮点击区域的可见性。 */
const DEFAULT_SPOTLIGHT_PADDING = 4;
/** 锚点壳通常没有圆角，用最低圆角保证聚光孔边缘不过于生硬。 */
const MIN_SPOTLIGHT_RADIUS = 10;
/** 亚像素抖动不触发重绘，真实位移仍会在下一帧跟上。 */
const FRAME_EPSILON = 0.1;
type SpotlightInsets = Required<GuideSpotlightPadding>;

function normalizePadding(padding?: GuideSpotlightPadding): SpotlightInsets {
  return {
    top: padding?.top ?? DEFAULT_SPOTLIGHT_PADDING,
    right: padding?.right ?? DEFAULT_SPOTLIGHT_PADDING,
    bottom: padding?.bottom ?? DEFAULT_SPOTLIGHT_PADDING,
    left: padding?.left ?? DEFAULT_SPOTLIGHT_PADDING,
  };
}

/** 百分比圆角以对应方向的尺寸为基准，其余单位按 CSS 长度解析。 */
function parseRadius(value: string, reference: number): number {
  const parsed = Number.parseFloat(value);
  if (!Number.isFinite(parsed)) return 0;
  return value.trim().endsWith('%') ? (parsed / 100) * reference : parsed;
}

/** 读取元素自身四角的圆角，水平与垂直方向都满足时才形成有效内圆角。 */
function readElementRadius(element: HTMLElement, rect: DOMRect): number {
  const style = getComputedStyle(element);
  const horizontalRadii = [
    style.borderTopLeftRadius,
    style.borderTopRightRadius,
    style.borderBottomLeftRadius,
    style.borderBottomRightRadius,
  ].map((value) => parseRadius(value, rect.width));
  const verticalRadii = [
    style.borderTopLeftRadius,
    style.borderTopRightRadius,
    style.borderBottomLeftRadius,
    style.borderBottomRightRadius,
  ].map((value) => parseRadius(value, rect.height));
  return Math.min(
    Math.max(...horizontalRadii),
    Math.max(...verticalRadii),
    rect.width / 2,
    rect.height / 2
  );
}

/** 锚点壳通常不画圆角，取同尺寸直接子元素上实际可见的圆角。 */
function readSpotlightRadius(element: HTMLElement, rect: DOMRect): number {
  let radius = readElementRadius(element, rect);
  for (const child of element.children) {
    if (!(child instanceof HTMLElement)) continue;
    const childRect = child.getBoundingClientRect();
    const sameBox =
      Math.abs(childRect.left - rect.left) <= 1 &&
      Math.abs(childRect.top - rect.top) <= 1 &&
      Math.abs(childRect.width - rect.width) <= 1 &&
      Math.abs(childRect.height - rect.height) <= 1;
    if (sameBox) radius = Math.max(radius, readElementRadius(child, childRect));
  }
  return radius;
}

function readFrame(
  toolIds: readonly GuideToolId[],
  padding: SpotlightInsets,
  radiusOverride?: number
): GuideSpotlightFrame {
  const rects = toolIds.flatMap((id) => {
    const element = findGuideTarget(id);
    if (!element) return [];
    const rect = element.getBoundingClientRect();
    const width = rect.width + padding.left + padding.right;
    const height = rect.height + padding.top + padding.bottom;
    const radiusPadding = Math.max(padding.top, padding.right, padding.bottom, padding.left);
    const radius =
      radiusOverride ??
      Math.max(readSpotlightRadius(element, rect) + radiusPadding, MIN_SPOTLIGHT_RADIUS);
    return [
      {
        left: rect.left - padding.left,
        top: rect.top - padding.top,
        width,
        height,
        radius: Math.min(radius, width / 2, height / 2),
      },
    ];
  });
  return { width: window.innerWidth, height: window.innerHeight, rects };
}

function isSameNumber(left: number, right: number): boolean {
  return Math.abs(left - right) <= FRAME_EPSILON;
}

function isSameFrame(left: GuideSpotlightFrame, right: GuideSpotlightFrame): boolean {
  return (
    left === right ||
    (isSameNumber(left.width, right.width) &&
      isSameNumber(left.height, right.height) &&
      left.rects.length === right.rects.length &&
      left.rects.every(
        (rect, index) =>
          isSameNumber(rect.left, right.rects[index].left) &&
          isSameNumber(rect.top, right.rects[index].top) &&
          isSameNumber(rect.width, right.rects[index].width) &&
          isSameNumber(rect.height, right.rects[index].height) &&
          isSameNumber(rect.radius, right.rects[index].radius)
      ))
  );
}

/** 跟踪多个高亮目标在视口中的位置，供聚光遮罩绘制高亮孔。 */
export function useGuideSpotlightFrame(
  toolIds: readonly GuideToolId[],
  padding?: GuideSpotlightPadding,
  radius?: number
): GuideSpotlightFrame {
  const { top, right, bottom, left } = normalizePadding(padding);
  const [frame, setFrame] = useState(() =>
    readFrame(toolIds, { top, right, bottom, left }, radius)
  );
  const frameRef = useRef(frame);

  useLayoutEffect(() => {
    let frameId = 0;
    const insets = { top, right, bottom, left };

    /**
     * 只监听 resize / scroll / 目标尺寸不够：响应式布局会在事件之后提交新的 DOM，
     * 目标也可能只改变位置而不改变尺寸。逐帧读取实际矩形，窗口复原或动画结束后都能收回原位。
     */
    const update = () => {
      const next = readFrame(toolIds, insets, radius);
      if (isSameFrame(frameRef.current, next)) return;
      frameRef.current = next;
      setFrame(next);
    };
    const loop = () => {
      update();
      frameId = window.requestAnimationFrame(loop);
    };

    update();
    frameId = window.requestAnimationFrame(loop);
    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [bottom, left, radius, right, toolIds, top]);

  return frame;
}
