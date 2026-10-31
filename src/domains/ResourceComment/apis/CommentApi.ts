import { executeApiContract } from '@/apis/executeApiContract';

import {
  CreateCommentApiContract,
  type CreateCommentApiContractRequest,
  type CreateCommentApiContractResponse,
  CreateReplyApiContract,
  type CreateReplyApiContractRequest,
  type CreateReplyApiContractResponse,
  DeleteCommentItemApiContract,
  type DeleteCommentItemApiContractRequest,
  ListCommentsApiContract,
  type ListCommentsApiContractRequest,
  type ListCommentsApiContractResponse,
  ListRepliesApiContract,
  type ListRepliesApiContractRequest,
  type ListRepliesApiContractResponse,
  ToggleCommentLikeApiContract,
  type ToggleCommentLikeApiContractRequest,
  type ToggleCommentLikeApiContractResponse,
} from './CommentApi.contract';

const createComment = (
  req: CreateCommentApiContractRequest
): Promise<CreateCommentApiContractResponse> => executeApiContract(CreateCommentApiContract, req);

const createReply = (req: CreateReplyApiContractRequest): Promise<CreateReplyApiContractResponse> =>
  executeApiContract(CreateReplyApiContract, req);

const deleteCommentItem = async (req: DeleteCommentItemApiContractRequest): Promise<void> => {
  await executeApiContract(DeleteCommentItemApiContract, req);
};

const toggleLike = (
  req: ToggleCommentLikeApiContractRequest
): Promise<ToggleCommentLikeApiContractResponse> =>
  executeApiContract(ToggleCommentLikeApiContract, req);

const listComments = (
  req: ListCommentsApiContractRequest
): Promise<ListCommentsApiContractResponse> => executeApiContract(ListCommentsApiContract, req);

const listReplies = (req: ListRepliesApiContractRequest): Promise<ListRepliesApiContractResponse> =>
  executeApiContract(ListRepliesApiContract, req);

export const CommentApi = {
  createComment,
  createReply,
  deleteCommentItem,
  toggleLike,
  listComments,
  listReplies,
};
