import { SpeechApi } from '@domain-apis';
import { SpeechServicesMap } from '../mapper/SpeechServices.map';
import type { ISpeechService } from './index.type';

const issueRecognitionCredential: ISpeechService['issueRecognitionCredential'] = async (params) => {
  const request = SpeechServicesMap.mapIssueRecognitionCredentialRequest(params);
  const response = await SpeechApi.issueRecognitionCredential(request);
  return SpeechServicesMap.mapRecognitionCredentialFromApi(response, params);
};

export const createSpeechServices = (): ISpeechService => ({
  issueRecognitionCredential,
});
