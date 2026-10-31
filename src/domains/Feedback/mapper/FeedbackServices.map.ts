import type { AddFeedbackApiRequest } from '../apis/FeedbackApi.schema';
import type { SubmitFeedbackRequest } from '../service/index.type';

const mapSubmitFeedbackRequest = (params: SubmitFeedbackRequest): AddFeedbackApiRequest => ({
  content: params.content,
  contact: params.contact,
  imageUrl: params.imageUrl?.trim() || undefined,
  browser: typeof navigator === 'undefined' ? undefined : navigator.userAgent,
  type: params.type,
});

export const FeedbackServicesMap = {
  mapSubmitFeedbackRequest,
};
