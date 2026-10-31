import { executeApiContract } from '@/apis/executeApiContract';

import {
  GetSingleHtmlPageContentApiContract,
  type GetSingleHtmlPageContentApiContractRequest,
  type GetSingleHtmlPageContentApiContractResponse,
  GetSingleHtmlPageInfoApiContract,
  type GetSingleHtmlPageInfoApiContractRequest,
  type GetSingleHtmlPageInfoApiContractResponse,
} from './HtmlPageApi.contract';

function getSingleHtmlPageInfo(
  req: GetSingleHtmlPageInfoApiContractRequest
): Promise<GetSingleHtmlPageInfoApiContractResponse> {
  return executeApiContract(GetSingleHtmlPageInfoApiContract, req);
}

function getSingleHtmlPageContent(
  req: GetSingleHtmlPageContentApiContractRequest
): Promise<GetSingleHtmlPageContentApiContractResponse> {
  return executeApiContract(GetSingleHtmlPageContentApiContract, req);
}

export const HtmlPageApi = {
  getSingleHtmlPageInfo,
  getSingleHtmlPageContent,
};
