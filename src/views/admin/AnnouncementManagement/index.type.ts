export type AnnouncementDeliveryScope = 'DIRECT' | 'ALL_USERS';
export type AnnouncementMessageType = 'SYSTEM' | 'NORMAL' | 'GROUP' | string;
export type AnnouncementPublishMessageType = 'SYSTEM' | 'NORMAL';

export interface AnnouncementRecord {
  messageId: string;
  deliveryScope?: AnnouncementDeliveryScope | string;
  messageType?: AnnouncementMessageType;
  title?: string;
  content?: string;
  jumpUrl?: string;
  readCount?: number;
  createTime?: string | null;
}

export interface PublishAnnouncementRequest {
  receiverUserIds: string[];
  deliveryScope: AnnouncementDeliveryScope;
  messageType: AnnouncementPublishMessageType;
  title: string;
  content: string;
  jumpUrl?: string;
}

export interface AnnouncementManagementProps {
  items: AnnouncementRecord[];
  total: number;
  loading: boolean;
  page: number;
  pageSize: number;
  onPageChange: (page: number, pageSize: number) => void;
  onRefresh: () => void | Promise<void>;
  onPublish: (request: PublishAnnouncementRequest) => Promise<void>;
}
