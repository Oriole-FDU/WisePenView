import type { Nullable, PageApiRequest, PageR } from '@/apis/api.type';

export type ListUserMessagesApiRequest = PageApiRequest;

export type MessageDeliveryScopeApiValue = 'DIRECT' | 'ALL_USERS';
export type MessageTypeApiValue = 'SYSTEM' | 'NORMAL' | 'RESOURCE_INTERACTION';

export interface UserMessageApiModel {
  messageId: string;
  deliveryScope: MessageDeliveryScopeApiValue;
  messageType: MessageTypeApiValue;
  title: string;
  content: string;
  jumpUrl: Nullable<string>;
  extra: Nullable<string>;
  readTime: Nullable<number>;
  createTime: number;
}

export type ListUserMessagesApiResponse = PageR<UserMessageApiModel>;

export interface ReadMessageApiRequest {
  messageIds: string[];
}
