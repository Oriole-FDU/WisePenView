import { apiGetUnchecked, apiPostUnchecked } from '@/apis/request';

import type {
  AddInlineCommentItemApiRequest,
  ChangeInlineCommentResolveStatusApiRequest,
  CreateInlineCommentApiRequest,
  DeleteInlineCommentItemApiRequest,
  DeleteInlineCommentItemReactionApiRequest,
  ListInlineCommentsApiRequest,
  ListInlineCommentsApiResponse,
  SetInlineCommentItemReactionApiRequest,
  UpdateInlineCommentItemApiRequest,
} from './InlineCommentApi.type';

const listInlineComments = (
  req: ListInlineCommentsApiRequest
): Promise<ListInlineCommentsApiResponse> =>
  apiGetUnchecked(`/resource/inlineComment/listInlineComments`, { params: req });

const createInlineComment = (req: CreateInlineCommentApiRequest): Promise<string> =>
  apiPostUnchecked(`/resource/inlineComment/createInlineComment`, req);

const addInlineCommentItem = (req: AddInlineCommentItemApiRequest): Promise<string> =>
  apiPostUnchecked(`/resource/inlineComment/addInlineCommentItem`, req);

const updateInlineCommentItem = (req: UpdateInlineCommentItemApiRequest): Promise<void> =>
  apiPostUnchecked(`/resource/inlineComment/updateInlineCommentItem`, req);

const setInlineCommentItemReaction = (req: SetInlineCommentItemReactionApiRequest): Promise<void> =>
  apiPostUnchecked(`/resource/inlineComment/setInlineCommentItemReaction`, req);

const deleteInlineCommentItemReaction = (
  req: DeleteInlineCommentItemReactionApiRequest
): Promise<void> =>
  apiPostUnchecked(`/resource/inlineComment/deleteInlineCommentItemReaction`, req);

const deleteInlineCommentItem = (req: DeleteInlineCommentItemApiRequest): Promise<void> =>
  apiPostUnchecked(`/resource/inlineComment/deleteInlineCommentItem`, req);

const changeInlineCommentResolveStatus = (
  req: ChangeInlineCommentResolveStatusApiRequest
): Promise<void> =>
  apiPostUnchecked(`/resource/inlineComment/changeInlineCommentResolveStatus`, req);

export const InlineCommentApi = {
  listInlineComments,
  createInlineComment,
  addInlineCommentItem,
  updateInlineCommentItem,
  setInlineCommentItemReaction,
  deleteInlineCommentItemReaction,
  deleteInlineCommentItem,
  changeInlineCommentResolveStatus,
};
