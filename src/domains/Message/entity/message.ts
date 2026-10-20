export type MessageDeliveryScope = 'DIRECT' | 'ALL_USERS';
export type MessageType = 'SYSTEM' | 'NORMAL' | 'GROUP' | 'RESOURCE_INTERACTION';

export interface UserMessage {
  messageId: string;
  deliveryScope?: MessageDeliveryScope | string;
  messageType?: MessageType | string;
  title: string;
  content: string;
  jumpUrl?: string;
  extra?: string;
  read: boolean;
  createTime?: number;
}
