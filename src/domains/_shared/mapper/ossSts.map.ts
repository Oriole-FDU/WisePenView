import { assertApiRecord, invalidApiResponse } from '@/apis/runtimeContract';

import type { OssStsTokenApiResponse } from '../apis/ossStsApi.type';

export function mapOssStsToken(data: unknown): OssStsTokenApiResponse {
  const record = assertApiRecord(data, 'OSS STS 响应契约无效');
  for (const key of ['accessKeyId', 'accessKeySecret', 'securityToken', 'bucket']) {
    if (typeof record[key] !== 'string' || !record[key]) invalidApiResponse('OSS STS 响应契约无效');
  }
  const string = (key: string): string | undefined =>
    typeof record[key] === 'string' && record[key] ? record[key] : undefined;
  const region = string('region');
  const endpoint = string('endpoint');
  if (!region && !endpoint) invalidApiResponse('OSS STS 区域契约无效');
  return {
    accessKeyId: string('accessKeyId'),
    accessKeySecret: string('accessKeySecret'),
    securityToken: string('securityToken'),
    bucket: string('bucket'),
    region,
    endpoint,
    expiration: string('expiration'),
  };
}
