import { apiGetUnchecked, apiPostUnchecked } from '@/apis/request';

import type {
  ListUserMessagesApiRequest,
  ListUserMessagesApiResponse,
  ReadMessageApiRequest,
} from './MessageApi.type';

function listUserMessages(req: ListUserMessagesApiRequest): Promise<ListUserMessagesApiResponse> {
  return apiGetUnchecked('/user/message/listMessages', { params: req });
}

function readMessage(req: ReadMessageApiRequest): Promise<void> {
  return apiPostUnchecked('/user/message/readMessage', req);
}

export const MessageApi = {
  listUserMessages,
  readMessage,
};
