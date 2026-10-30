import { executeApiContract } from '@/apis/executeApiContract';

import {
  AddInlineCommentItemApiContract,
  type AddInlineCommentItemApiContractRequest,
  ChangeInlineCommentResolveStatusApiContract,
  type ChangeInlineCommentResolveStatusApiContractRequest,
  CreateInlineCommentApiContract,
  type CreateInlineCommentApiContractRequest,
  DeleteInlineCommentItemApiContract,
  type DeleteInlineCommentItemApiContractRequest,
  DeleteInlineCommentItemReactionApiContract,
  type DeleteInlineCommentItemReactionApiContractRequest,
  ListInlineCommentsApiContract,
  type ListInlineCommentsApiContractRequest,
  type ListInlineCommentsApiContractResponse,
  SetInlineCommentItemReactionApiContract,
  type SetInlineCommentItemReactionApiContractRequest,
  UpdateInlineCommentItemApiContract,
  type UpdateInlineCommentItemApiContractRequest,
} from './InlineCommentApi.contract';

const listInlineComments = (
  req: ListInlineCommentsApiContractRequest
): Promise<ListInlineCommentsApiContractResponse> =>
  executeApiContract(ListInlineCommentsApiContract, req);

const createInlineComment = (req: CreateInlineCommentApiContractRequest): Promise<string> =>
  executeApiContract(CreateInlineCommentApiContract, req);

const addInlineCommentItem = (req: AddInlineCommentItemApiContractRequest): Promise<string> =>
  executeApiContract(AddInlineCommentItemApiContract, req);

const updateInlineCommentItem = async (
  req: UpdateInlineCommentItemApiContractRequest
): Promise<void> => {
  await executeApiContract(UpdateInlineCommentItemApiContract, req);
};

const setInlineCommentItemReaction = async (
  req: SetInlineCommentItemReactionApiContractRequest
): Promise<void> => {
  await executeApiContract(SetInlineCommentItemReactionApiContract, req);
};

const deleteInlineCommentItemReaction = async (
  req: DeleteInlineCommentItemReactionApiContractRequest
): Promise<void> => {
  await executeApiContract(DeleteInlineCommentItemReactionApiContract, req);
};

const deleteInlineCommentItem = async (
  req: DeleteInlineCommentItemApiContractRequest
): Promise<void> => {
  await executeApiContract(DeleteInlineCommentItemApiContract, req);
};

const changeInlineCommentResolveStatus = async (
  req: ChangeInlineCommentResolveStatusApiContractRequest
): Promise<void> => {
  await executeApiContract(ChangeInlineCommentResolveStatusApiContract, req);
};

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
