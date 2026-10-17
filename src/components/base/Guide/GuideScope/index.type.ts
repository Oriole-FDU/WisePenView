import type { ReactNode } from 'react';

import type { GuideToolId, GuideTourId } from '@/constants/tour';

export interface GuideScopeProps {
  tourId?: GuideTourId;
  /** 页面就绪锚点。默认使用首步目标，异步页面应指定始终存在的页面级锚点。 */
  readyToolId?: GuideToolId;
  children: ReactNode;
}
