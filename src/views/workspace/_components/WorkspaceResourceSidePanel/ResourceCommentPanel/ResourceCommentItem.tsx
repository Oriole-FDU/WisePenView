import AppAvatar from '@/components/Avatar';
import AppIconButton from '@/components/Button/AppIconButton';
import type { ResourceComment } from '@/domains/Interact';
import { formatTimestampToDateTime } from '@/utils/format/formatTime';
import { Button, Tooltip } from '@heroui/react';
import { Heart, MessageCircle, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation(['resource', 'common']);
  const canDelete = currentUserId === comment.authorId || currentUserId === resourceOwnerId;
  const timeText =
    formatTimestampToDateTime(comment.createTime) || t('resource:comment.unknownTime');
  const commentDate = new Date(comment.createTime);
  const dateTime = Number.isFinite(commentDate.getTime()) ? commentDate.toISOString() : undefined;

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
          <strong>{comment.author.name}</strong>
          {comment.replyToUser ? (
            <span>{t('resource:comment.replyTo', { name: comment.replyToUser.name })}</span>
          ) : null}
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

        <div className={styles.commentMeta}>
          <time dateTime={dateTime}>{timeText}</time>
          {!comment.deleted ? (
            <div className={styles.commentActions}>
              <AppIconButton
                icon={<MessageCircle size={14} aria-hidden />}
                label={t('resource:comment.replyAction', { name: comment.author.name })}
                size="sm"
                tooltip={{ content: t('resource:comment.reply') }}
                onPress={() => onReply(comment)}
              />
              <Tooltip>
                <Tooltip.Trigger>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={liked ? styles.likedButton : undefined}
                    isDisabled={likePending}
                    aria-label={liked ? t('resource:comment.unlike') : t('resource:comment.like')}
                    onPress={() => void onLike(comment)}
                  >
                    <Heart size={14} aria-hidden fill={liked ? 'currentColor' : 'none'} />
                    {comment.likeCount > 0 ? comment.likeCount : null}
                  </Button>
                </Tooltip.Trigger>
                <Tooltip.Content>
                  {liked ? t('resource:comment.unlike') : t('resource:comment.like')}
                </Tooltip.Content>
              </Tooltip>
              {canDelete ? (
                <AppIconButton
                  icon={<Trash2 size={14} aria-hidden />}
                  label={t('resource:comment.delete')}
                  size="sm"
                  tooltip={{ content: t('common:actions.delete') }}
                  onPress={() => onDelete(comment)}
                />
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </article>
  );
}

export default ResourceCommentItem;
