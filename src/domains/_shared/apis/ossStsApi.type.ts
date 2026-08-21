/** OSS STS 接口返回的临时凭证。 */
export interface OssStsTokenApiResponse {
  accessKeyId?: string;
  accessKeySecret?: string;
  securityToken?: string;
  bucket?: string;
  region?: string;
  endpoint?: string;
  expiration?: string;
}
