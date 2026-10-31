import { ResourceServicesMap } from '@/domains/Resource/mapper/ResourceServices.map';
import { formatTimestampToDateTime } from '@/utils/format/formatTime';
import { normalizeNonNegativeNumber } from '@/utils/normalize/normalizeNumber';

import type {
  SingleHtmlPageInfoApiResponse,
  SingleHtmlPageVersionInfoApiResponse,
} from '../apis/HtmlPageApi.schema';
import type { HtmlPageDisplayInfo, HtmlPageVersionInfo } from '../service/index.type';

const mapVersionInfoFromApi = (
  data: SingleHtmlPageVersionInfoApiResponse,
  fallbackVersion: number
): HtmlPageVersionInfo => ({
  version: data.version || fallbackVersion,
  status: data.singleHtmlPageStatus,
  size: normalizeNonNegativeNumber(data.size),
  updateTime: data.updateTime,
  lastEditedAtText: formatTimestampToDateTime(data.updateTime),
});

export const mapHtmlPageInfoFromApi = (
  data: SingleHtmlPageInfoApiResponse
): HtmlPageDisplayInfo => {
  const currentVersion = data.currentVersion;
  return {
    resourceInfo: ResourceServicesMap.mapResourceItemFromApi(data.resourceInfo),
    currentVersion,
    versionInfo: data.versionInfo
      ? mapVersionInfoFromApi(data.versionInfo, currentVersion)
      : undefined,
  };
};

export const HtmlPageServicesMap = {
  mapHtmlPageInfoFromApi,
};
