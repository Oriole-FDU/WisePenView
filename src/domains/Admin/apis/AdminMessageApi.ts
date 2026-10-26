import { apiGetUnchecked, apiPostUnchecked } from '@/apis/request';

import type {
  ListAdminMessagesApiRequest,
  ListAdminMessagesApiResponse,
  PublishMessageApiRequest,
} from './AdminMessageApi.type';

function listAdminMessages(
  req: ListAdminMessagesApiRequest
): Promise<ListAdminMessagesApiResponse> {
  return apiGetUnchecked('/admin/message/listMessages', { params: req });
}

function publishMessage(req: PublishMessageApiRequest): Promise<void> {
  return apiPostUnchecked('/admin/message/publishMessage', req);
}

export const AdminMessageApi = { listAdminMessages, publishMessage };
