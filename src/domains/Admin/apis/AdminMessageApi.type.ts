import type { PageApiRequest, PageR } from '@/apis/api.type';

export type ListAdminMessagesApiRequest = PageApiRequest;

export interface AdminMessageApiModel {
  messageId?: string | number | null;
  deliveryScope?: string | null;
  messageType?: string | null;
  title?: string | null;
  content?: string | null;
  jumpUrl?: string | null;
  extra?: string | null;
  readCount?: number | null;
  createTime?: string | null;
}

export type ListAdminMessagesApiResponse = PageR<AdminMessageApiModel>;

export type PublishMessageApiDeliveryScope = 'DIRECT' | 'ALL_USERS';
export type PublishMessageApiType = 'SYSTEM' | 'NORMAL';

export interface PublishMessageApiRequest {
  receiverUserIds: string[];
  deliveryScope: PublishMessageApiDeliveryScope;
  messageType: PublishMessageApiType;
  title: string;
  content: string;
  jumpUrl?: string;
  extra?: string;
}
