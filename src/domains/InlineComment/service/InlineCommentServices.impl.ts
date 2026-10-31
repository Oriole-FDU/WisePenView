import { InlineCommentApi } from '@domain-apis';

import { InlineCommentServicesMap } from '../mapper/InlineCommentServices.map';
import type {
  AddInlineCommentItemRequest,
  ChangeInlineCommentResolveStatusRequest,
  CreateInlineCommentRequest,
  DeleteInlineCommentItemReactionRequest,
  DeleteInlineCommentItemRequest,
  IInlineCommentService,
  ListInlineCommentsRequest,
  SetInlineCommentItemReactionRequest,
  UpdateInlineCommentItemRequest,
} from './index.type';

const listInlineComments = async (params: ListInlineCommentsRequest) =>
  InlineCommentServicesMap.mapListFromApi(
    await InlineCommentApi.listInlineComments(InlineCommentServicesMap.mapListRequest(params))
  );

const createInlineComment = async (params: CreateInlineCommentRequest): Promise<string> =>
  InlineCommentApi.createInlineComment(InlineCommentServicesMap.mapCreateRequest(params));

const addInlineCommentItem = async (params: AddInlineCommentItemRequest): Promise<string> =>
  InlineCommentApi.addInlineCommentItem(InlineCommentServicesMap.mapAddItemRequest(params));

const updateInlineCommentItem = (params: UpdateInlineCommentItemRequest): Promise<void> =>
  InlineCommentApi.updateInlineCommentItem(InlineCommentServicesMap.mapUpdateItemRequest(params));

const setInlineCommentItemReaction = (params: SetInlineCommentItemReactionRequest): Promise<void> =>
  InlineCommentApi.setInlineCommentItemReaction(params);

const deleteInlineCommentItemReaction = (
  params: DeleteInlineCommentItemReactionRequest
): Promise<void> => InlineCommentApi.deleteInlineCommentItemReaction(params);

const deleteInlineCommentItem = (params: DeleteInlineCommentItemRequest): Promise<void> =>
  InlineCommentApi.deleteInlineCommentItem(params);

const changeInlineCommentResolveStatus = (
  params: ChangeInlineCommentResolveStatusRequest
): Promise<void> => InlineCommentApi.changeInlineCommentResolveStatus(params);

export const createInlineCommentServices = (): IInlineCommentService => ({
  listInlineComments,
  createInlineComment,
  addInlineCommentItem,
  updateInlineCommentItem,
  setInlineCommentItemReaction,
  deleteInlineCommentItemReaction,
  deleteInlineCommentItem,
  changeInlineCommentResolveStatus,
});
