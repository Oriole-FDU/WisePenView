import {
  type ApiContractRequest,
  type ApiContractResponse,
  defineApiContract,
} from '@/apis/contract';

import {
  GetSingleHtmlPageContentApiRequestSchema,
  GetSingleHtmlPageContentApiResponseSchema,
  GetSingleHtmlPageInfoApiRequestSchema,
  SingleHtmlPageInfoApiResponseSchema,
} from './HtmlPageApi.schema';

export const GetSingleHtmlPageInfoApiContract = defineApiContract({
  name: 'GetSingleHtmlPageInfoApi',
  method: 'POST',
  endpoint: '/singleHtmlPage/getSingleHtmlPageInfo',
  requestPlacement: 'query',
  transport: 'json',
  request: GetSingleHtmlPageInfoApiRequestSchema,
  response: SingleHtmlPageInfoApiResponseSchema,
});

export const GetSingleHtmlPageContentApiContract = defineApiContract({
  name: 'GetSingleHtmlPageContentApi',
  method: 'GET',
  endpoint: '/singleHtmlPage/getSingleHtmlPageContent',
  requestPlacement: 'query',
  transport: 'text',
  request: GetSingleHtmlPageContentApiRequestSchema,
  response: GetSingleHtmlPageContentApiResponseSchema,
});

export type GetSingleHtmlPageInfoApiContractRequest = ApiContractRequest<
  typeof GetSingleHtmlPageInfoApiContract
>;
export type GetSingleHtmlPageInfoApiContractResponse = ApiContractResponse<
  typeof GetSingleHtmlPageInfoApiContract
>;
export type GetSingleHtmlPageContentApiContractRequest = ApiContractRequest<
  typeof GetSingleHtmlPageContentApiContract
>;
export type GetSingleHtmlPageContentApiContractResponse = ApiContractResponse<
  typeof GetSingleHtmlPageContentApiContract
>;
