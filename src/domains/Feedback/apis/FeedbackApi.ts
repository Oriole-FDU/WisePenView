import { executeApiContract } from '@/apis/executeApiContract';

import { AddFeedbackApiContract, type AddFeedbackApiContractRequest } from './FeedbackApi.contract';

async function addFeedback(request: AddFeedbackApiContractRequest): Promise<void> {
  await executeApiContract(AddFeedbackApiContract, request);
}

export const FeedbackApi = { addFeedback };
