import { createError, FRONTEND_CLIENT_ERROR } from '@/utils/error';

import type {
  IssueRecognitionCredentialApiRequest,
  IssueRecognitionCredentialApiResponse,
} from '../apis/SpeechApi.schema';
import type { XfyunSpeechLanguage } from '../runtime/XfyunSpeechRecognizer';
import type {
  IssueRecognitionCredentialRequest,
  SpeechRecognitionCredential,
} from '../service/index.type';

/** 界面语言 → 讯飞听写识别语言：英文界面走英文识别，其余按中文识别 */
export function resolveXfyunSpeechLanguage(language: string | undefined): XfyunSpeechLanguage {
  return language?.toLowerCase().startsWith('en') ? 'en_us' : 'zh_cn';
}

function mapIssueRecognitionCredentialRequest(
  params: IssueRecognitionCredentialRequest
): IssueRecognitionCredentialApiRequest {
  if (!Number.isInteger(params.eosMs) || params.eosMs < 1000 || params.eosMs > 10000) {
    throw createError({ code: FRONTEND_CLIENT_ERROR.SPEECH_EOS_INVALID, source: 'client' });
  }
  return { provider: 'IFLYTEK', options: { eos_ms: params.eosMs } };
}

function mapRecognitionCredentialFromApi(
  response: IssueRecognitionCredentialApiResponse,
  params: IssueRecognitionCredentialRequest
): SpeechRecognitionCredential {
  if (response.provider !== 'IFLYTEK') {
    throw createError({
      code: FRONTEND_CLIENT_ERROR.SPEECH_PROVIDER_UNSUPPORTED,
      source: 'client',
      meta: {
        provider: response.provider,
      },
    });
  }

  const websocketUrlValue = response.credential.url;
  let websocketUrl: URL;
  try {
    websocketUrl = new URL(websocketUrlValue);
  } catch (error) {
    throw createError({
      code: FRONTEND_CLIENT_ERROR.SPEECH_CREDENTIAL_INVALID,
      source: 'client',
      cause: error,
    });
  }
  if (websocketUrl.protocol !== 'wss:' || websocketUrl.hostname !== 'iat-api.xfyun.cn') {
    throw createError({
      code: FRONTEND_CLIENT_ERROR.SPEECH_CREDENTIAL_INVALID,
      source: 'client',
      meta: {
        protocol: websocketUrl.protocol,
        hostname: websocketUrl.hostname,
      },
    });
  }

  return {
    provider: 'IFLYTEK',
    expiresAt: response.expires_at,
    websocketUrl: websocketUrlValue,
    appId: response.credential.common.app_id,
    eosMs: params.eosMs,
  };
}

export const SpeechServicesMap = {
  mapIssueRecognitionCredentialRequest,
  mapRecognitionCredentialFromApi,
};
