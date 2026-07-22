import AppDisplayDialog from '@/components/Overlay/AppDisplayDialog';
import { formatTimestampToDateTime } from '@/utils/format/formatTime';
import type { ReactNode } from 'react';
import FeedbackStatusSelect from '../FeedbackStatusSelect';
import type { FeedbackDetailDialogProps } from './index.type';
import styles from './style.module.less';

const EMPTY_TEXT = '-';

const formatOptionalText = (value?: string | number | null): string => {
  if (value == null) return EMPTY_TEXT;
  const text = String(value).trim();
  return text ? text : EMPTY_TEXT;
};

const formatDateTime = (value?: string | null): string => {
  const formatted = formatTimestampToDateTime(value);
  return formatted || EMPTY_TEXT;
};

function DetailField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className={styles.field}>
      <span className={styles.label}>{label}：</span>
      <div className={styles.value}>{children}</div>
    </div>
  );
}

function FeedbackDetailDialog({
  isOpen,
  onOpenChange,
  feedback,
  onStatusChange,
}: FeedbackDetailDialogProps) {
  const imageUrl = feedback?.imageUrl?.trim() ?? '';

  return (
    <AppDisplayDialog
      isOpen={isOpen && feedback != null}
      onOpenChange={onOpenChange}
      title="反馈详情"
      size="lg"
      placement="center"
      dialogClassName={styles.dialog}
      bodyClassName={styles.dialogBody}
      classNames={{ heading: styles.dialogHeading }}
      closeText="关闭"
    >
      {feedback ? (
        <div className={styles.detail}>
          <div className={styles.row}>
            <DetailField label="用户">
              {formatOptionalText(feedback.username || feedback.userId)}
            </DetailField>
            <DetailField label="用户id">{formatOptionalText(feedback.userId)}</DetailField>
          </div>

          <div className={styles.row}>
            <DetailField label="联系方式">{formatOptionalText(feedback.contact)}</DetailField>
            <DetailField label="提交时间">{formatDateTime(feedback.createTime)}</DetailField>
          </div>

          <DetailField label="内容">
            <p className={styles.content}>{formatOptionalText(feedback.content)}</p>
          </DetailField>

          <DetailField label="图片">
            {imageUrl ? (
              <a
                className={styles.imageLink}
                href={imageUrl}
                target="_blank"
                rel="noreferrer"
                title="打开原图"
              >
                <img className={styles.image} src={imageUrl} alt="反馈图片" />
              </a>
            ) : (
              EMPTY_TEXT
            )}
          </DetailField>

          <DetailField label="处理状态">
            <FeedbackStatusSelect
              status={feedback.status}
              onChange={(status) => onStatusChange(feedback.feedbackId, status)}
            />
          </DetailField>
        </div>
      ) : null}
    </AppDisplayDialog>
  );
}

export default FeedbackDetailDialog;
