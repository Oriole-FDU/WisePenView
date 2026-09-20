import { normalizeId } from '@/utils/normalize/normalizeId';

import type {
  AdminMessageApiModel,
  ListAdminMessagesApiRequest,
  ListAdminMessagesApiResponse,
  PublishMessageApiRequest,
} from '../apis/AdminMessageApi.type';
import type { AdminMessage } from '../entity/message';
import type {
  ListAdminMessagesRequest,
  ListAdminMessagesResponse,
  PublishMessageRequest,
} from '../service/index.type';

const mapAdminMessageApiModelToEntity = (raw: AdminMessageApiModel): AdminMessage => ({
  messageId: normalizeId(raw.messageId),
  deliveryScope: raw.deliveryScope ?? undefined,
  messageType: raw.messageType ?? undefined,
  title: raw.title ?? undefined,
  content: raw.content ?? undefined,
  jumpUrl: raw.jumpUrl ?? undefined,
  extra: raw.extra ?? undefined,
  readCount: raw.readCount ?? 0,
  createTime: raw.createTime ?? undefined,
});

const mapListAdminMessagesRequest = (
  params: ListAdminMessagesRequest
): ListAdminMessagesApiRequest => ({
  page: params.page,
  size: params.size,
});

const mapListAdminMessagesFromApi = (
  data: ListAdminMessagesApiResponse
): ListAdminMessagesResponse => ({
  messages: data.list.map(mapAdminMessageApiModelToEntity),
  total: data.total,
  page: data.page,
  size: data.size,
  totalPage: data.totalPage,
});

const mapPublishMessageRequest = (params: PublishMessageRequest): PublishMessageApiRequest => ({
  receiverUserIds: params.receiverUserIds,
  deliveryScope: params.deliveryScope,
  messageType: params.deliveryScope === 'ALL_USERS' ? 'SYSTEM' : params.messageType,
  title: params.title,
  content: params.content,
  jumpUrl: params.jumpUrl,
  extra: params.extra,
});

export const AdminMessageServicesMap = {
  mapListAdminMessagesRequest,
  mapListAdminMessagesFromApi,
  mapPublishMessageRequest,
};
