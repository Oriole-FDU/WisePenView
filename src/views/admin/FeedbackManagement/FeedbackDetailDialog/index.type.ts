import type { FeedbackType } from '@/domains/User';

/** 反馈处理状态（前端本地约定，待后端协议对齐） */
export type FeedbackStatus = 'PENDING' | 'PROCESSING' | 'RESOLVED';

export const FEEDBACK_STATUS_LABEL: Record<FeedbackStatus, string> = {
  PENDING: '待处理',
  PROCESSING: '处理中',
  RESOLVED: '已处理',
};

/** 处理状态可选值（前端本地切换） */
export const FEEDBACK_STATUS_OPTIONS: Array<{
  value: FeedbackStatus;
  label: string;
}> = [
  { value: 'PENDING', label: FEEDBACK_STATUS_LABEL.PENDING },
  { value: 'PROCESSING', label: FEEDBACK_STATUS_LABEL.PROCESSING },
  { value: 'RESOLVED', label: FEEDBACK_STATUS_LABEL.RESOLVED },
];

/** 页面本地反馈列表项，待后端接入后再迁入领域层 */
export interface FeedbackListItem {
  feedbackId: string;
  userId: string;
  username?: string;
  content: string;
  contact: string;
  imageUrl?: string;
  types: FeedbackType[];
  status: FeedbackStatus;
  createTime?: string;
}

export interface FeedbackDetailDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  feedback: FeedbackListItem | null;
  onStatusChange: (feedbackId: string, status: FeedbackStatus) => void;
}
