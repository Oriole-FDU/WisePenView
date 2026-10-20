import OSS from 'ali-oss';

import type { OssStsTokenApiResponse } from '@/domains/_shared/apis/ossStsApi.type';
import { createClientError, FRONTEND_CLIENT_ERROR } from '@/utils/error';

export interface OssReadClient {
  get(objectKey: string): Promise<{ content?: unknown }>;
}

export const createOssClient = (token: OssStsTokenApiResponse): OssReadClient => {
  if (
    !token.accessKeyId ||
    !token.accessKeySecret ||
    !token.securityToken ||
    !token.bucket ||
    !token.region
  ) {
    throw createClientError(FRONTEND_CLIENT_ERROR.OSS_CREDENTIAL_INVALID);
  }

  return new OSS({
    region: token.region,
    bucket: token.bucket,
    accessKeyId: token.accessKeyId,
    accessKeySecret: token.accessKeySecret,
    stsToken: token.securityToken,
    secure: true,
  });
};
