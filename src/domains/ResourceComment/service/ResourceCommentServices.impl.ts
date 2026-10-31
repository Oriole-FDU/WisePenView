import { CommentApi } from '@domain-apis';

import { ResourceCommentServicesMap } from '../mapper/ResourceCommentServices.map';
import type { IResourceCommentService } from './index.type';

const listComments: IResourceCommentService['listComments'] = async (params) =>
  ResourceCommentServicesMap.mapCommentPageFromApi(await CommentApi.listComments(params));

const listReplies: IResourceCommentService['listReplies'] = async (params) =>
  ResourceCommentServicesMap.mapCommentPageFromApi(await CommentApi.listReplies(params));

const createComment: IResourceCommentService['createComment'] = (params) =>
  CommentApi.createComment({ ...params, imageUrls: params.imageUrls ?? [] });

const createReply: IResourceCommentService['createReply'] = (params) =>
  CommentApi.createReply({ ...params, imageUrls: params.imageUrls ?? [] });

export const createResourceCommentServices = (): IResourceCommentService => ({
  listComments,
  listReplies,
  createComment,
  createReply,
  deleteComment: (params) => CommentApi.deleteCommentItem(params),
  toggleCommentLike: (params) => CommentApi.toggleLike(params),
});
