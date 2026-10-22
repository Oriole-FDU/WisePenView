import { cloneElement, isValidElement, type ReactElement } from 'react';

import type { GuideToolId } from '@/constants/tour';

import type { GuideAnchorProps } from './index.type';
import styles from './style.module.scss';

const LAYOUT_CLASS = {
  inline: styles.inline,
  area: styles.area,
  fill: styles.fill,
} as const;

type AnchorElement = ReactElement<{ 'data-guide-tool-id'?: GuideToolId }>;

/** 高亮锚点。外层只有定位，不改里面组件的样式。 */
function GuideAnchor({ id, layout = 'inline', asChild = false, children }: GuideAnchorProps) {
  if (!id) return children;
  if (asChild) {
    if (!isValidElement(children)) return children;
    return cloneElement(children as AnchorElement, { 'data-guide-tool-id': id });
  }
  return (
    <span data-guide-tool-id={id} className={LAYOUT_CLASS[layout]}>
      {children}
    </span>
  );
}

export default GuideAnchor;
