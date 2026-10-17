import { assertApiPage, optionalApiNumber, optionalApiString } from '@/apis/runtimeContract';
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
  deliveryScope: optionalApiString(raw.deliveryScope) ?? undefined,
  messageType: optionalApiString(raw.messageType) ?? undefined,
  title: optionalApiString(raw.title) ?? undefined,
  content: optionalApiString(raw.content) ?? undefined,
  jumpUrl: optionalApiString(raw.jumpUrl) ?? undefined,
  extra: optionalApiString(raw.extra) ?? undefined,
  readCount: optionalApiNumber(raw.readCount) ?? 0,
  createTime: optionalApiString(raw.createTime) ?? undefined,
});

const mapListAdminMessagesRequest = (
  params: ListAdminMessagesRequest
): ListAdminMessagesApiRequest => ({
  page: params.page,
  size: params.size,
});

const mapListAdminMessagesFromApi = (
  data: ListAdminMessagesApiResponse
): ListAdminMessagesResponse => {
  const page = assertApiPage(
    data,
    (value): value is AdminMessageApiModel => {
      if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
      const row = value as Record<string, unknown>;
      return (
        (typeof row.messageId === 'string' && row.messageId.length > 0) ||
        (typeof row.messageId === 'number' && Number.isFinite(row.messageId))
      );
    },
    'Admin 消息分页契约无效'
  );
  return {
    messages: page.list.map(mapAdminMessageApiModelToEntity),
    total: page.total,
    page: page.page,
    size: page.size,
    totalPage: page.totalPage,
  };
};

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
