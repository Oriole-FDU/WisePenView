import { apiPost } from '@/apis/request';

import type {
  IssueRecognitionCredentialApiRequest,
  IssueRecognitionCredentialApiResponse,
} from './SpeechApi.type';

function issueRecognitionCredential(
  body: IssueRecognitionCredentialApiRequest
): Promise<IssueRecognitionCredentialApiResponse> {
  return apiPost('/chat/speech/getCredential', body);
}

export const SpeechApi = {
  issueRecognitionCredential,
};
