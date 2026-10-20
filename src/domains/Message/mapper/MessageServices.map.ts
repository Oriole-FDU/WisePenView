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
  messageId: raw.messageId,
  deliveryScope: raw.deliveryScope,
  messageType: normalizeMessageType(raw.messageType) ?? raw.messageType,
  title: raw.title.trim(),
  content: raw.content,
  jumpUrl: raw.jumpUrl?.trim() || undefined,
  extra: raw.extra ?? undefined,
  read: raw.readTime != null,
  createTime: raw.createTime,
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
