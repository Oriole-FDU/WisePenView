import {
  assertApiPage,
  isApiId,
  isRecord,
  optionalApiNumber,
  optionalApiString,
} from '@/apis/runtimeContract';
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
  deliveryScope: optionalApiString(raw.deliveryScope) ?? undefined,
  messageType:
    normalizeMessageType(optionalApiString(raw.messageType) ?? undefined) ??
    optionalApiString(raw.messageType) ??
    undefined,
  title: optionalApiString(raw.title)?.trim() ?? '',
  content: optionalApiString(raw.content) ?? '',
  jumpUrl: optionalApiString(raw.jumpUrl)?.trim() || undefined,
  extra: optionalApiString(raw.extra) ?? undefined,
  read: typeof raw.readTime === 'string' && Boolean(raw.readTime),
  createTime: optionalApiNumber(raw.createTime) ?? undefined,
});

const mapListUserMessagesRequest = (
  params: ListUserMessagesRequest
): ListUserMessagesApiRequest => ({
  page: params.page,
  size: params.size,
});

const mapListUserMessagesFromApi = (
  data: ListUserMessagesApiResponse
): ListUserMessagesResponse => {
  const page = assertApiPage(
    data,
    (value): value is UserMessageApiModel => isRecord(value) && isApiId(value.messageId),
    '用户消息分页响应契约无效'
  );
  return {
    messages: page.list.map(mapUserMessageApiModelToEntity),
    total: page.total,
    page: page.page,
    size: page.size,
    totalPage: page.totalPage,
  };
};

const mapReadMessagesRequest = (params: ReadMessagesRequest): ReadMessageApiRequest => ({
  messageIds: params.messageIds,
});

export const MessageServicesMap = {
  mapListUserMessagesRequest,
  mapListUserMessagesFromApi,
  mapReadMessagesRequest,
};
