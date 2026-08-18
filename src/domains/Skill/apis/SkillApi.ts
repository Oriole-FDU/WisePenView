import { apiGet, apiPost } from '@/apis/request';
import type { OssStsTokenApiResponse } from '@/domains/_shared/apis/ossStsApi.type';
import type { InitUploadAssetsApiResponse } from '@/domains/_shared/apis/versionAssetApi.type';
import type {
  CreateSkillApiRequest,
  DeleteSkillAssetsApiRequest,
  ForkSkillApiRequest,
  GetSkillAssetStsTokenApiRequest,
  GetSkillInfoApiRequest,
  GetSkillVersionBundleInfoApiRequest,
  InitUploadSkillAssetsApiRequest,
  PublishSkillVersionApiRequest,
  SkillInfoApiResponse,
  SkillVersionBundleApiResponse,
  UpdateSkillInfoApiRequest,
} from './SkillApi.type';

function createSkill(body: CreateSkillApiRequest): Promise<string | undefined> {
  return apiPost('/skill/createSkill', body);
}

function forkSkill(body: ForkSkillApiRequest): Promise<string | undefined> {
  return apiPost('/skill/forkSkill', body);
}

function getSkillInfo(query: GetSkillInfoApiRequest): Promise<SkillInfoApiResponse | undefined> {
  return apiPost('/skill/getSkillInfo', null, { params: query });
}

function getSkillVersionBundleInfo(
  query: GetSkillVersionBundleInfoApiRequest
): Promise<SkillVersionBundleApiResponse | undefined> {
  return apiPost('/skill/getSkillVersionBundleInfo', null, { params: query });
}

function getSkillAssetStsToken(
  query: GetSkillAssetStsTokenApiRequest
): Promise<OssStsTokenApiResponse | undefined> {
  return apiGet('/skill/getSkillAssetStsToken', { params: query });
}

function changeSkillInfo(body: UpdateSkillInfoApiRequest): Promise<void> {
  return apiPost('/skill/changeSkillInfo', body);
}

function initUploadSkillAssets(
  body: InitUploadSkillAssetsApiRequest
): Promise<InitUploadAssetsApiResponse | undefined> {
  return apiPost('/skill/initUploadSkillAssets', body);
}

function deleteSkillAssets(body: DeleteSkillAssetsApiRequest): Promise<void> {
  return apiPost('/skill/deleteSkillAssets', body);
}

function publishSkillVersion(body: PublishSkillVersionApiRequest): Promise<void> {
  return apiPost('/skill/publishSkillVersion', body);
}

export const SkillApi = {
  createSkill,
  forkSkill,
  getSkillInfo,
  getSkillVersionBundleInfo,
  getSkillAssetStsToken,
  changeSkillInfo,
  initUploadSkillAssets,
  deleteSkillAssets,
  publishSkillVersion,
};
