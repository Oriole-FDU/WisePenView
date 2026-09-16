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
  const query = MessageServicesMap.mapListUserMessagesRequest(params);
  const data = await MessageApi.listUserMessages(query);
  return MessageServicesMap.mapListUserMessagesFromApi(data);
};

const readMessages = async (params: ReadMessagesRequest): Promise<void> => {
  const body = MessageServicesMap.mapReadMessagesRequest(params);
  await MessageApi.readMessage(body);
};

export const createMessageServices = (): IMessageService => ({
  listUserMessages,
  readMessages,
});
