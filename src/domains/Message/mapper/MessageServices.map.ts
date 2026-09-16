import { normalizeId } from '@/utils/normalize/normalizeId';

import type {
  ListUserMessagesApiRequest,
  ListUserMessagesApiResponse,
  ReadMessageApiRequest,
  UserMessageApiModel,
} from '../apis/MessageApi.type';
import type { UserMessage } from '../entity/message';
import type {
  ListUserMessagesRequest,
  ListUserMessagesResponse,
  ReadMessagesRequest,
} from '../service/index.type';
import { normalizeMessageType } from './messageType.mapper';

const mapUserMessageApiModelToEntity = (raw: UserMessageApiModel): UserMessage => ({
  messageId: normalizeId(raw.messageId),
  deliveryScope: raw.deliveryScope ?? undefined,
  messageType: normalizeMessageType(raw.messageType ?? undefined) ?? raw.messageType ?? undefined,
  title: raw.title?.trim() ?? '',
  content: raw.content ?? '',
  jumpUrl: raw.jumpUrl?.trim() || undefined,
  extra: raw.extra ?? undefined,
  read: Boolean(raw.readTime),
  createTime: raw.createTime ?? undefined,
});

const mapListUserMessagesRequest = (
  params: ListUserMessagesRequest
): ListUserMessagesApiRequest => ({
  page: params.page,
  size: params.size,
});

const mapListUserMessagesFromApi = (
  data: ListUserMessagesApiResponse
): ListUserMessagesResponse => ({
  messages: data.list.map(mapUserMessageApiModelToEntity),
  total: data.total,
  page: data.page,
  size: data.size,
  totalPage: data.totalPage,
});

const mapReadMessagesRequest = (params: ReadMessagesRequest): ReadMessageApiRequest => ({
  messageIds: params.messageIds,
});

export const MessageServicesMap = {
  mapListUserMessagesRequest,
  mapListUserMessagesFromApi,
  mapReadMessagesRequest,
};
