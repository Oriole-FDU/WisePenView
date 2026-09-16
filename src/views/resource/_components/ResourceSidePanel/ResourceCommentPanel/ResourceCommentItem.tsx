import { Tooltip } from '@heroui/react';
import { Heart, MessageCircle, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import AppAvatar from '@/components/base/Avatar';
import { AppButton } from '@/components/base/Button';
import AppIconButton from '@/components/base/Button/AppIconButton';
import type { ResourceComment } from '@/domains/Interact';
import { TOOLTIP_FOCUS_PASSTHROUGH_PROPS } from '@/layouts/_common/a11y/tooltipFocusPassthrough';
import { cn } from '@/utils/cn';
import {
  formatRelativeTimestamp,
  formatTimestampToDateTime,
  parseTimestampToDate,
} from '@/utils/format/formatTime';

import styles from './style.module.less';
import { getAuthorInitial, hasVisibleCommentContent } from './utils';

interface ResourceCommentItemProps {
  comment: ResourceComment;
  currentUserId?: string;
  resourceOwnerId?: string | null;
  liked: boolean;
  likePending: boolean;
  onReply(comment: ResourceComment): void;
  onLike(comment: ResourceComment): Promise<boolean>;
  onDelete(comment: ResourceComment): void;
  onPreviewImage(url: string): void;
}

function ResourceCommentItem({
  comment,
  currentUserId,
  resourceOwnerId,
  liked,
  likePending,
  onReply,
  onLike,
  onDelete,
  onPreviewImage,
}: ResourceCommentItemProps) {
  const { t, i18n } = useTranslation(['resource', 'common']);
  const locale = i18n.resolvedLanguage === 'en-US' ? 'en-US' : 'zh-CN';
  const canDelete = currentUserId === comment.authorId || currentUserId === resourceOwnerId;
  const unknownTime = t('resource:comment.unknownTime');
  const commentDate = parseTimestampToDate(comment.createTime);
  const absoluteTime = commentDate
    ? formatTimestampToDateTime(commentDate) || unknownTime
    : unknownTime;
  const relativeTime = commentDate
    ? formatRelativeTimestamp(commentDate, locale) || unknownTime
    : unknownTime;
  const dateTime = commentDate?.toISOString();
  const likeLabel = liked ? t('resource:comment.unlike') : t('resource:comment.like');

  return (
    <article className={styles.commentItem}>
      <AppAvatar aria-label={comment.author.name} className={styles.avatar}>
        {comment.author.avatar ? (
          <AppAvatar.Image src={comment.author.avatar} alt={comment.author.name} />
        ) : null}
        <AppAvatar.Fallback>{getAuthorInitial(comment.author.name)}</AppAvatar.Fallback>
      </AppAvatar>

      <div className={styles.commentBody}>
        <div className={styles.authorLine}>
          <div className={styles.authorMeta}>
            <strong>{comment.author.name}</strong>
            {comment.replyToUser ? (
              <span>{t('resource:comment.replyTo', { name: comment.replyToUser.name })}</span>
            ) : null}
          </div>
          <time className={styles.commentTime} dateTime={dateTime} title={absoluteTime}>
            {relativeTime}
          </time>
        </div>

        {comment.deleted ? (
          <p className={styles.deletedText}>{t('resource:comment.deleted')}</p>
        ) : (
          <>
            {hasVisibleCommentContent(comment.content) ? (
              <p className={styles.commentContent}>{comment.content}</p>
            ) : null}
            {comment.imageUrls.length > 0 ? (
              <div className={styles.commentImages}>
                {comment.imageUrls.map((url, index) => (
                  <button
                    key={`${url}-${index}`}
                    type="button"
                    className={styles.commentImageButton}
                    aria-label={t('resource:comment.previewImage')}
                    onClick={() => onPreviewImage(url)}
                  >
                    <img src={url} alt={t('resource:comment.imageAlt')} loading="lazy" />
                  </button>
                ))}
              </div>
            ) : null}
          </>
        )}

        {!comment.deleted ? (
          <div className={styles.commentActions}>
            <AppIconButton
              icon={<MessageCircle size={14} aria-hidden />}
              label={t('resource:comment.replyAction', { name: comment.author.name })}
              size="sm"
              className={styles.commentActionIcon}
              tooltip={{ content: t('resource:comment.reply') }}
              onPress={() => onReply(comment)}
            />
            <Tooltip>
              <Tooltip.Trigger {...TOOLTIP_FOCUS_PASSTHROUGH_PROPS}>
                <AppButton
                  variant="ghost"
                  size="sm"
                  className={cn(styles.commentActionIcon, liked && styles.likedButton)}
                  isDisabled={likePending}
                  aria-label={likeLabel}
                  onPress={() => void onLike(comment)}
                >
                  <Heart size={14} aria-hidden fill={liked ? 'currentColor' : 'none'} />
                  {comment.likeCount > 0 ? (
                    <span className={styles.likeCount}>{comment.likeCount}</span>
                  ) : null}
                </AppButton>
              </Tooltip.Trigger>
              <Tooltip.Content>{likeLabel}</Tooltip.Content>
            </Tooltip>
            {canDelete ? (
              <AppIconButton
                icon={<Trash2 size={14} aria-hidden />}
                label={t('resource:comment.delete')}
                size="sm"
                className={styles.commentActionIcon}
                tooltip={{ content: t('common:actions.delete') }}
                onPress={() => onDelete(comment)}
              />
            ) : null}
          </div>
        ) : null}
      </div>
    </article>
  );
}

export default ResourceCommentItem;
