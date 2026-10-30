import { z } from 'zod';

import {
  type ApiContractRequest,
  type ApiContractResponse,
  defineApiContract,
} from '@/apis/contract';
import { EmptyApiResponseSchema } from '@/apis/schema';

import {
  CommentItemActionApiRequestSchema,
  CommentPageApiResponseSchema,
  CreateCommentApiRequestSchema,
  CreateReplyApiRequestSchema,
  ListCommentsApiRequestSchema,
  ListRepliesApiRequestSchema,
} from './CommentApi.schema';

export const CreateCommentApiContract = defineApiContract({
  name: 'CreateCommentApi',
  method: 'POST',
  endpoint: '/resource/comment/createComment',
  requestPlacement: 'body',
  transport: 'json',
  request: CreateCommentApiRequestSchema,
  response: z.string(),
});

export const CreateReplyApiContract = defineApiContract({
  name: 'CreateReplyApi',
  method: 'POST',
  endpoint: '/resource/comment/createReply',
  requestPlacement: 'body',
  transport: 'json',
  request: CreateReplyApiRequestSchema,
  response: z.string(),
});

export const DeleteCommentItemApiContract = defineApiContract({
  name: 'DeleteCommentItemApi',
  method: 'POST',
  endpoint: '/resource/comment/deleteCommentItem',
  requestPlacement: 'body',
  transport: 'json',
  request: CommentItemActionApiRequestSchema,
  response: EmptyApiResponseSchema,
});

export const ToggleCommentLikeApiContract = defineApiContract({
  name: 'ToggleCommentLikeApi',
  method: 'POST',
  endpoint: '/resource/comment/toggleLike',
  requestPlacement: 'body',
  transport: 'json',
  request: CommentItemActionApiRequestSchema,
  response: z.boolean(),
});

export const ListCommentsApiContract = defineApiContract({
  name: 'ListCommentsApi',
  method: 'GET',
  endpoint: '/resource/comment/listComments',
  requestPlacement: 'query',
  transport: 'json',
  request: ListCommentsApiRequestSchema,
  response: CommentPageApiResponseSchema,
});

export const ListRepliesApiContract = defineApiContract({
  name: 'ListRepliesApi',
  method: 'GET',
  endpoint: '/resource/comment/listReplies',
  requestPlacement: 'query',
  transport: 'json',
  request: ListRepliesApiRequestSchema,
  response: CommentPageApiResponseSchema,
});

export type CreateCommentApiContractRequest = ApiContractRequest<typeof CreateCommentApiContract>;
export type CreateCommentApiContractResponse = ApiContractResponse<typeof CreateCommentApiContract>;
export type CreateReplyApiContractRequest = ApiContractRequest<typeof CreateReplyApiContract>;
export type CreateReplyApiContractResponse = ApiContractResponse<typeof CreateReplyApiContract>;
export type DeleteCommentItemApiContractRequest = ApiContractRequest<
  typeof DeleteCommentItemApiContract
>;
export type ToggleCommentLikeApiContractRequest = ApiContractRequest<
  typeof ToggleCommentLikeApiContract
>;
export type ToggleCommentLikeApiContractResponse = ApiContractResponse<
  typeof ToggleCommentLikeApiContract
>;
export type ListCommentsApiContractRequest = ApiContractRequest<typeof ListCommentsApiContract>;
export type ListCommentsApiContractResponse = ApiContractResponse<typeof ListCommentsApiContract>;
export type ListRepliesApiContractRequest = ApiContractRequest<typeof ListRepliesApiContract>;
export type ListRepliesApiContractResponse = ApiContractResponse<typeof ListRepliesApiContract>;
