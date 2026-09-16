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
  InlineCommentServicesMap.mapCreatedId(
    await InlineCommentApi.createInlineComment(InlineCommentServicesMap.mapCreateRequest(params)),
    'inlineCommentId'
  );

const addInlineCommentItem = async (params: AddInlineCommentItemRequest): Promise<string> =>
  InlineCommentServicesMap.mapCreatedId(
    await InlineCommentApi.addInlineCommentItem(InlineCommentServicesMap.mapAddItemRequest(params)),
    'itemId'
  );

const updateInlineCommentItem = (params: UpdateInlineCommentItemRequest): Promise<void> =>
  InlineCommentApi.updateInlineCommentItem(InlineCommentServicesMap.mapUpdateItemRequest(params));

const setInlineCommentItemReaction = (params: SetInlineCommentItemReactionRequest): Promise<void> =>
  InlineCommentApi.setInlineCommentItemReaction(
    InlineCommentServicesMap.mapSetReactionRequest(params)
  );

const deleteInlineCommentItemReaction = (
  params: DeleteInlineCommentItemReactionRequest
): Promise<void> =>
  InlineCommentApi.deleteInlineCommentItemReaction(
    InlineCommentServicesMap.mapDeleteReactionRequest(params)
  );

const deleteInlineCommentItem = (params: DeleteInlineCommentItemRequest): Promise<void> =>
  InlineCommentApi.deleteInlineCommentItem(InlineCommentServicesMap.mapDeleteItemRequest(params));

const changeInlineCommentResolveStatus = (
  params: ChangeInlineCommentResolveStatusRequest
): Promise<void> =>
  InlineCommentApi.changeInlineCommentResolveStatus(
    InlineCommentServicesMap.mapResolveRequest(params)
  );

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
