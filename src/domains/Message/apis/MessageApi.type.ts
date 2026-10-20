import type { PageApiRequest, PageR } from '@/apis/api.type';

export type ListUserMessagesApiRequest = PageApiRequest;

export type MessageDeliveryScopeApiValue = 'DIRECT' | 'ALL_USERS';
export type MessageTypeApiValue = 'SYSTEM' | 'NORMAL' | 'RESOURCE_INTERACTION';

export interface UserMessageApiModel {
  messageId: string;
  deliveryScope: MessageDeliveryScopeApiValue;
  messageType: MessageTypeApiValue;
  title: string;
  content: string;
  jumpUrl: string | null;
  extra: string | null;
  readTime: number | null;
  createTime: number;
}

export type ListUserMessagesApiResponse = PageR<UserMessageApiModel>;

export interface ReadMessageApiRequest {
  messageIds: string[];
}
