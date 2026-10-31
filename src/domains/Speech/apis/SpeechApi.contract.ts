import { defineApiContract } from '@/apis/contract';

import {
  IssueRecognitionCredentialApiRequestSchema,
  IssueRecognitionCredentialApiResponseSchema,
} from './SpeechApi.schema';

export const IssueRecognitionCredentialApiContract = defineApiContract({
  name: 'IssueRecognitionCredentialApi',
  method: 'POST',
  endpoint: '/chat/speech/getCredential',
  requestPlacement: 'body',
  transport: 'json',
  request: IssueRecognitionCredentialApiRequestSchema,
  response: IssueRecognitionCredentialApiResponseSchema,
});
