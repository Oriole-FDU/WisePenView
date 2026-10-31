import { FeedbackApi } from '@domain-apis';

import { FeedbackServicesMap } from '../mapper/FeedbackServices.map';
import type { IFeedbackService } from './index.type';

export const createFeedbackServices = (): IFeedbackService => ({
  submitFeedback: (params) =>
    FeedbackApi.addFeedback(FeedbackServicesMap.mapSubmitFeedbackRequest(params)),
});
