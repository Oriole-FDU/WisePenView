import OSS from 'ali-oss';

import type { OssStsTokenApi } from '@/domains/_shared/apis/ossStsApi.schema';
import { createDomainError, FRONTEND_DOMAIN_ERROR } from '@/utils/error';

export interface OssReadClient {
  get(objectKey: string): Promise<{ content?: unknown }>;
}

export const createOssClient = (token: OssStsTokenApi): OssReadClient => {
  if (
    !token.accessKeyId ||
    !token.accessKeySecret ||
    !token.securityToken ||
    !token.bucket ||
    (!token.region && !token.endpoint)
  ) {
    throw createDomainError(FRONTEND_DOMAIN_ERROR.OSS_CREDENTIAL_INVALID);
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
