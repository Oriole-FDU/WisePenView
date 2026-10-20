import type { Nullable, PageApiRequest, PageR } from '@/apis/api.type';

export type ListAdminMessagesApiRequest = PageApiRequest;

export interface AdminMessageApiModel {
  messageId?: Nullable<string | number>;
  deliveryScope?: Nullable<string>;
  messageType?: Nullable<string>;
  title?: Nullable<string>;
  content?: Nullable<string>;
  jumpUrl?: Nullable<string>;
  extra?: Nullable<string>;
  readCount?: Nullable<number>;
  createTime?: Nullable<string>;
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
