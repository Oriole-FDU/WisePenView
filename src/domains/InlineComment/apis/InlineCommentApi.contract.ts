import {
  type ApiContractRequest,
  type ApiContractResponse,
  defineApiContract,
} from '@/apis/contract';
import { EmptyApiResponseSchema, OpaqueIdSchema } from '@/apis/schema';

import {
  AddInlineCommentItemApiRequestSchema,
  ChangeInlineCommentResolveStatusApiRequestSchema,
  CreateInlineCommentApiRequestSchema,
  DeleteInlineCommentItemApiRequestSchema,
  DeleteInlineCommentItemReactionApiRequestSchema,
  ListInlineCommentsApiRequestSchema,
  ListInlineCommentsApiResponseSchema,
  SetInlineCommentItemReactionApiRequestSchema,
  UpdateInlineCommentItemApiRequestSchema,
} from './InlineCommentApi.schema';

export const ListInlineCommentsApiContract = defineApiContract({
  name: 'ListInlineCommentsApi',
  method: 'GET',
  endpoint: '/resource/inlineComment/listInlineComments',
  requestPlacement: 'query',
  transport: 'json',
  request: ListInlineCommentsApiRequestSchema,
  response: ListInlineCommentsApiResponseSchema,
});

export const CreateInlineCommentApiContract = defineApiContract({
  name: 'CreateInlineCommentApi',
  method: 'POST',
  endpoint: '/resource/inlineComment/createInlineComment',
  requestPlacement: 'body',
  transport: 'json',
  request: CreateInlineCommentApiRequestSchema,
  response: OpaqueIdSchema,
});

export const AddInlineCommentItemApiContract = defineApiContract({
  name: 'AddInlineCommentItemApi',
  method: 'POST',
  endpoint: '/resource/inlineComment/addInlineCommentItem',
  requestPlacement: 'body',
  transport: 'json',
  request: AddInlineCommentItemApiRequestSchema,
  response: OpaqueIdSchema,
});

export const UpdateInlineCommentItemApiContract = defineApiContract({
  name: 'UpdateInlineCommentItemApi',
  method: 'POST',
  endpoint: '/resource/inlineComment/updateInlineCommentItem',
  requestPlacement: 'body',
  transport: 'json',
  request: UpdateInlineCommentItemApiRequestSchema,
  response: EmptyApiResponseSchema,
});

export const SetInlineCommentItemReactionApiContract = defineApiContract({
  name: 'SetInlineCommentItemReactionApi',
  method: 'POST',
  endpoint: '/resource/inlineComment/setInlineCommentItemReaction',
  requestPlacement: 'body',
  transport: 'json',
  request: SetInlineCommentItemReactionApiRequestSchema,
  response: EmptyApiResponseSchema,
});

export const DeleteInlineCommentItemReactionApiContract = defineApiContract({
  name: 'DeleteInlineCommentItemReactionApi',
  method: 'POST',
  endpoint: '/resource/inlineComment/deleteInlineCommentItemReaction',
  requestPlacement: 'body',
  transport: 'json',
  request: DeleteInlineCommentItemReactionApiRequestSchema,
  response: EmptyApiResponseSchema,
});

export const DeleteInlineCommentItemApiContract = defineApiContract({
  name: 'DeleteInlineCommentItemApi',
  method: 'POST',
  endpoint: '/resource/inlineComment/deleteInlineCommentItem',
  requestPlacement: 'body',
  transport: 'json',
  request: DeleteInlineCommentItemApiRequestSchema,
  response: EmptyApiResponseSchema,
});

export const ChangeInlineCommentResolveStatusApiContract = defineApiContract({
  name: 'ChangeInlineCommentResolveStatusApi',
  method: 'POST',
  endpoint: '/resource/inlineComment/changeInlineCommentResolveStatus',
  requestPlacement: 'body',
  transport: 'json',
  request: ChangeInlineCommentResolveStatusApiRequestSchema,
  response: EmptyApiResponseSchema,
});

export type ListInlineCommentsApiContractRequest = ApiContractRequest<
  typeof ListInlineCommentsApiContract
>;
export type ListInlineCommentsApiContractResponse = ApiContractResponse<
  typeof ListInlineCommentsApiContract
>;
export type CreateInlineCommentApiContractRequest = ApiContractRequest<
  typeof CreateInlineCommentApiContract
>;
export type AddInlineCommentItemApiContractRequest = ApiContractRequest<
  typeof AddInlineCommentItemApiContract
>;
export type UpdateInlineCommentItemApiContractRequest = ApiContractRequest<
  typeof UpdateInlineCommentItemApiContract
>;
export type SetInlineCommentItemReactionApiContractRequest = ApiContractRequest<
  typeof SetInlineCommentItemReactionApiContract
>;
export type DeleteInlineCommentItemReactionApiContractRequest = ApiContractRequest<
  typeof DeleteInlineCommentItemReactionApiContract
>;
export type DeleteInlineCommentItemApiContractRequest = ApiContractRequest<
  typeof DeleteInlineCommentItemApiContract
>;
export type ChangeInlineCommentResolveStatusApiContractRequest = ApiContractRequest<
  typeof ChangeInlineCommentResolveStatusApiContract
>;
