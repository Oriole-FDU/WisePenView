import { type ApiContractRequest, defineApiContract } from '@/apis/contract';
import { EmptyApiResponseSchema } from '@/apis/schema';

import { AddFeedbackApiRequestSchema } from './FeedbackApi.schema';

export const AddFeedbackApiContract = defineApiContract({
  name: 'AddFeedbackApi',
  method: 'POST',
  endpoint: '/system/feedback/addFeedback',
  requestPlacement: 'body',
  transport: 'json',
  request: AddFeedbackApiRequestSchema,
  response: EmptyApiResponseSchema,
});

export type AddFeedbackApiContractRequest = ApiContractRequest<typeof AddFeedbackApiContract>;
