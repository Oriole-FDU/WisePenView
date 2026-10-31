import { MessageApi } from '@domain-apis';

import { MessageServicesMap } from '../mapper/MessageServices.map';
import type {
  IMessageService,
  ListUserMessagesRequest,
  ListUserMessagesResponse,
  ReadMessagesRequest,
} from './index.type';

const listUserMessages = async (
  params: ListUserMessagesRequest
): Promise<ListUserMessagesResponse> => {
  const data = await MessageApi.listUserMessages(params);
  return MessageServicesMap.mapListUserMessagesFromApi(data);
};

const readMessages = async (params: ReadMessagesRequest): Promise<void> => {
  await MessageApi.readMessage(params);
};

export const createMessageServices = (): IMessageService => ({
  listUserMessages,
  readMessages,
});
