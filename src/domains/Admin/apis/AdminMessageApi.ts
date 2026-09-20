import { apiGet, apiPost } from '@/apis/request';

import type {
  ListAdminMessagesApiRequest,
  ListAdminMessagesApiResponse,
  PublishMessageApiRequest,
} from './AdminMessageApi.type';

function listAdminMessages(
  req: ListAdminMessagesApiRequest
): Promise<ListAdminMessagesApiResponse> {
  return apiGet('/admin/message/listMessages', { params: req });
}

function publishMessage(req: PublishMessageApiRequest): Promise<void> {
  return apiPost('/admin/message/publishMessage', req);
}

export const AdminMessageApi = { listAdminMessages, publishMessage };
