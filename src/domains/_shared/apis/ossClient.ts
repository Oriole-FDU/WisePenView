import type { OssStsTokenApiResponse } from '@/apis/api.type';
import { createClientError, FRONTEND_CLIENT_ERROR } from '@/utils/error';
import OSS from 'ali-oss';

export interface OssReadClient {
  get(objectKey: string): Promise<{ content?: unknown }>;
}

export const createOssClient = (token: OssStsTokenApiResponse): OssReadClient => {
  if (
    !token.accessKeyId ||
    !token.accessKeySecret ||
    !token.securityToken ||
    !token.bucket ||
    (!token.region && !token.endpoint)
  ) {
    throw createClientError(FRONTEND_CLIENT_ERROR.OSS_CREDENTIAL_INVALID);
  }

  return new OSS({
    region: token.region,
    endpoint: token.endpoint,
    bucket: token.bucket,
    accessKeyId: token.accessKeyId,
    accessKeySecret: token.accessKeySecret,
    stsToken: token.securityToken,
    secure: true,
  });
};
