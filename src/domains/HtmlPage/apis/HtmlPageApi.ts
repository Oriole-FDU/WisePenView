import { apiGetText, apiPostUnchecked } from '@/apis/request';

import type {
  GetSingleHtmlPageContentApiRequest,
  GetSingleHtmlPageInfoApiRequest,
  SingleHtmlPageInfoApiResponse,
} from './HtmlPageApi.type';

function getSingleHtmlPageInfo(
  req: GetSingleHtmlPageInfoApiRequest
): Promise<SingleHtmlPageInfoApiResponse> {
  return apiPostUnchecked('/singleHtmlPage/getSingleHtmlPageInfo', undefined, { params: req });
}

function getSingleHtmlPageContent(req: GetSingleHtmlPageContentApiRequest): Promise<string> {
  return apiGetText('/singleHtmlPage/getSingleHtmlPageContent', { params: req });
}

export const HtmlPageApi = {
  getSingleHtmlPageInfo,
  getSingleHtmlPageContent,
};
