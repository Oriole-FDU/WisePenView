export type MessageDeliveryScope = 'DIRECT' | 'ALL_USERS';
export type MessageType = 'SYSTEM' | 'NORMAL' | 'GROUP';

export interface AdminMessage {
  messageId: string;
  deliveryScope?: MessageDeliveryScope | string;
  messageType?: MessageType | string;
  title?: string;
  content?: string;
  jumpUrl?: string;
  extra?: string;
  readCount?: number;
  createTime?: string;
}
