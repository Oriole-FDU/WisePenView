import type { FeedbackType } from '../enum';

export interface SubmitFeedbackRequest {
  type: FeedbackType;
  content: string;
  contact: string;
  imageUrl?: string;
}

export interface IFeedbackService {
  submitFeedback(params: SubmitFeedbackRequest): Promise<void>;
}
