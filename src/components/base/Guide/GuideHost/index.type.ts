import type { GuideTourConfig, GuideTourId } from '@/constants/tour';

import type { GuideActionPort } from '../guideActions';

export interface GuideHostProps {
  shellTourId?: GuideTourId;
  actions: GuideActionPort;
}

export interface GuidePlayerProps {
  tour: GuideTourConfig;
  actions: GuideActionPort;
  onFinished: () => void;
}
