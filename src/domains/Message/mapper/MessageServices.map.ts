import type { ListUserMessagesApiResponse, UserMessageApiModel } from '../apis/MessageApi.schema';
import type { UserMessage } from '../entity/message';
import type { ListUserMessagesResponse } from '../service/index.type';
import { normalizeMessageType } from './messageType.mapper';

const mapUserMessageApiModelToEntity = (raw: UserMessageApiModel): UserMessage => ({
  messageId: raw.messageId,
  deliveryScope: raw.deliveryScope ?? undefined,
  messageType: normalizeMessageType(raw.messageType ?? undefined) ?? raw.messageType ?? undefined,
  title: raw.title?.trim() ?? '',
  content: raw.content ?? '',
  jumpUrl: raw.jumpUrl?.trim() || undefined,
  extra: raw.extra ?? undefined,
  read: Boolean(raw.readTime),
  createTime: raw.createTime ?? undefined,
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

export const MessageServicesMap = {
  mapListUserMessagesFromApi,
};
