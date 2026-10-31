import type { UserVerificationApi as UserVerificationApiContract } from '../apis/UserVerificationApi';
import type { CheckFudanUISVerifyApiResponse } from '../apis/UserVerificationApi.schema';

let mockUisPollCount = 0;

/** 1×1 透明 PNG 的 base64，与线上一致：仅返回图片字符编码、无 data: 前缀 */
const MOCK_UIS_QR_PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

const checkFudanUISVerify = async (): Promise<CheckFudanUISVerifyApiResponse> => {
  mockUisPollCount += 1;
  if (mockUisPollCount < 3) {
    return { completed: false, requireAction: false, actionPayload: '', message: '' };
  }
  if (mockUisPollCount === 3) {
    return {
      completed: false,
      requireAction: true,
      actionPayload: MOCK_UIS_QR_PNG_BASE64,
      message: 'Mock：请扫码（未完成，将继续每 2 秒查询）',
    };
  }
  return {
    completed: true,
    requireAction: false,
    actionPayload: '',
    message: 'Mock：认证已完成',
  };
};

export const UserVerificationApi: typeof UserVerificationApiContract = {
  initiateEmailVerify: async () => undefined,
  initiateFudanUISVerify: async () => {
    mockUisPollCount = 0;
  },
  checkFudanUISVerify,
  checkEmailVerify: async () => undefined,
};
