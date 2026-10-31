import { HtmlPageApi } from '@domain-apis';

import { HtmlPageServicesMap } from '../mapper/HtmlPageServices.map';
import type { HtmlPageDisplayInfo, IHtmlPageService } from './index.type';

const getHtmlPageInfo = async (
  resourceId: string,
  targetVersion?: number
): Promise<HtmlPageDisplayInfo> => {
  const data = await HtmlPageApi.getSingleHtmlPageInfo({ resourceId, targetVersion });
  return HtmlPageServicesMap.mapHtmlPageInfoFromApi(data);
};

const getHtmlPageContent = (resourceId: string, targetVersion?: number): Promise<string> => {
  return HtmlPageApi.getSingleHtmlPageContent({ resourceId, targetVersion });
};

const getResourceAccessInfo: IHtmlPageService['getResourceAccessInfo'] = async (resourceId) => {
  const data = await HtmlPageApi.getSingleHtmlPageInfo({ resourceId });
  return data.resourceInfo;
};

export const createHtmlPageServices = (): IHtmlPageService => ({
  getHtmlPageInfo,
  getHtmlPageContent,
  getResourceAccessInfo,
});
