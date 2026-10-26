import { apiGetUnchecked, apiPostUnchecked } from '@/apis/request';
import type { OssStsTokenApiResponse } from '@/domains/_shared/apis/ossStsApi.type';
import type {
  CancelUploadAssetsApiRequest,
  InitUploadAssetsApiResponse,
} from '@/domains/_shared/apis/versionAssetApi.type';

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
  return apiPostUnchecked('/skill/createSkill', body);
}

function forkSkill(body: ForkSkillApiRequest): Promise<string | undefined> {
  return apiPostUnchecked('/skill/forkSkill', body);
}

function getSkillInfo(query: GetSkillInfoApiRequest): Promise<SkillInfoApiResponse | undefined> {
  return apiPostUnchecked('/skill/getSkillInfo', null, { params: query });
}

function getSkillVersionBundleInfo(
  query: GetSkillVersionBundleInfoApiRequest
): Promise<SkillVersionBundleApiResponse | undefined> {
  return apiPostUnchecked('/skill/getSkillVersionBundleInfo', null, { params: query });
}

function getSkillAssetStsToken(
  query: GetSkillAssetStsTokenApiRequest
): Promise<OssStsTokenApiResponse | undefined> {
  return apiGetUnchecked('/skill/getSkillAssetStsToken', { params: query });
}

function changeSkillInfo(body: UpdateSkillInfoApiRequest): Promise<void> {
  return apiPostUnchecked('/skill/changeSkillInfo', body);
}

function initUploadSkillAssets(
  body: InitUploadSkillAssetsApiRequest
): Promise<InitUploadAssetsApiResponse | undefined> {
  return apiPostUnchecked('/skill/initUploadSkillAssets', body);
}

function deleteSkillAssets(body: DeleteSkillAssetsApiRequest): Promise<void> {
  return apiPostUnchecked('/skill/deleteSkillAssets', body);
}

function cancelUploadSkillAssets(body: CancelUploadAssetsApiRequest): Promise<void> {
  return apiPostUnchecked('/skill/cancelUploadSkillAssets', body);
}

function publishSkillVersion(body: PublishSkillVersionApiRequest): Promise<void> {
  return apiPostUnchecked('/skill/publishSkillVersion', body);
}

export const SkillApi = {
  createSkill,
  forkSkill,
  getSkillInfo,
  getSkillVersionBundleInfo,
  getSkillAssetStsToken,
  changeSkillInfo,
  initUploadSkillAssets,
  cancelUploadSkillAssets,
  deleteSkillAssets,
  publishSkillVersion,
};
