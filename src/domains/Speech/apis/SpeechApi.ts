import { executeApiContract } from '@/apis/executeApiContract';

import { IssueRecognitionCredentialApiContract } from './SpeechApi.contract';
import type {
  IssueRecognitionCredentialApiRequest,
  IssueRecognitionCredentialApiResponse,
} from './SpeechApi.schema';

function issueRecognitionCredential(
  body: IssueRecognitionCredentialApiRequest
): Promise<IssueRecognitionCredentialApiResponse> {
  return executeApiContract(IssueRecognitionCredentialApiContract, body);
}

export const SpeechApi = {
  issueRecognitionCredential,
};
