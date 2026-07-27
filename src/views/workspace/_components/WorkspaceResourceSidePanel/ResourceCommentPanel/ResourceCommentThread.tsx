import { useInteractService } from '@/domains';
import type { ResourceComment } from '@/domains/Interact';
import { parseErrorMessage } from '@/utils/error';
import { Button } from '@heroui/react';
import { useRequest } from 'ahooks';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import CommentComposer from './CommentComposer';
import ResourceCommentItem from './ResourceCommentItem';
import styles from './style.module.less';
import { updateCommentLikeCount } from './utils';

const REPLY_PAGE_SIZE = 10;

interface ResourceCommentThreadProps {
  resourceId: string;
  rootComment: ResourceComment;
  currentUserId?: string;
  resourceOwnerId?: string | null;
  likedCommentIds: ReadonlySet<string>;
  pendingLikeIds: ReadonlySet<string>;
  onLike(comment: ResourceComment): Promise<boolean>;
  onDelete(comment: ResourceComment, onDeleted?: () => void | Promise<void>): void;
  onCommentsChanged(): Promise<void>;
  onPreviewImage(url: string): void;
}

function ResourceCommentThread({
  resourceId,
  rootComment,
  currentUserId,
  resourceOwnerId,
  likedCommentIds,
  pendingLikeIds,
  onLike,
  onDelete,
  onCommentsChanged,
  onPreviewImage,
}: ResourceCommentThreadProps) {
  const { t } = useTranslation('resource');
  const interactService = useInteractService();
  const [expanded, setExpanded] = useState(false);
  const [replies, setReplies] = useState<ResourceComment[]>([]);
  const [replyPage, setReplyPage] = useState(1);
  const [replyTarget, setReplyTarget] = useState<ResourceComment>();

  const {
    data: replyPageData,
    error: repliesError,
    loading: repliesLoading,
    runAsync: loadReplies,
  } = useRequest(
    async (page: number, append: boolean) => {
      const data = await interactService.listReplies({
        rootCommentId: rootComment.commentId,
        page,
        size: REPLY_PAGE_SIZE,
      });
      setReplies((current) => (append ? [...current, ...data.items] : data.items));
      setReplyPage(page);
      return data;
    },
    { manual: true }
  );

  const handleToggleReplies = () => {
    if (expanded) {
      setExpanded(false);
      return;
    }
    setExpanded(true);
    if (replies.length === 0) void loadReplies(1, false);
  };

  const handleReplyLike = async (reply: ResourceComment) => {
    const wasLiked = likedCommentIds.has(reply.commentId);
    const liked = await onLike(reply);
    if (liked !== wasLiked) {
      setReplies((current) => updateCommentLikeCount(current, reply.commentId, liked));
    }
    return liked;
  };

  const handleReplySubmit = async (content: string, imageUrls: string[]) => {
    if (!replyTarget) return;
    await interactService.createReply({
      resourceId,
      replyTo: replyTarget.commentId,
      content,
      imageUrls,
    });
    setReplyTarget(undefined);
    setExpanded(true);
    await loadReplies(1, false);
    await onCommentsChanged();
  };

  return (
    <div className={styles.commentThread}>
      <ResourceCommentItem
        comment={rootComment}
        currentUserId={currentUserId}
        resourceOwnerId={resourceOwnerId}
        liked={likedCommentIds.has(rootComment.commentId)}
        likePending={pendingLikeIds.has(rootComment.commentId)}
        onReply={setReplyTarget}
        onLike={onLike}
        onDelete={onDelete}
        onPreviewImage={onPreviewImage}
      />

      {rootComment.replyCount > 0 ? (
        <Button
          variant="ghost"
          size="sm"
          className={styles.replyToggle}
          onPress={handleToggleReplies}
        >
          {expanded ? <ChevronUp size={14} aria-hidden /> : <ChevronDown size={14} aria-hidden />}
          {expanded
            ? t('comment.collapseReplies')
            : t('comment.replyCount', { count: rootComment.replyCount })}
        </Button>
      ) : null}

      {expanded ? (
        <div className={styles.replyList}>
          {repliesLoading && replies.length === 0 ? (
            <p className={styles.mutedText}>{t('comment.loadingReplies')}</p>
          ) : null}
          {replies.map((reply) => (
            <ResourceCommentItem
              key={reply.commentId}
              comment={reply}
              currentUserId={currentUserId}
              resourceOwnerId={resourceOwnerId}
              liked={likedCommentIds.has(reply.commentId)}
              likePending={pendingLikeIds.has(reply.commentId)}
              onReply={setReplyTarget}
              onLike={handleReplyLike}
              onDelete={(comment) =>
                onDelete(comment, async () => {
                  await loadReplies(1, false);
                })
              }
              onPreviewImage={onPreviewImage}
            />
          ))}
          {repliesError ? (
            <p className={styles.errorText}>{parseErrorMessage(repliesError)}</p>
          ) : null}
          {replyPageData && replyPage < replyPageData.totalPage ? (
            <Button
              variant="ghost"
              size="sm"
              className={styles.loadMoreButton}
              isDisabled={repliesLoading}
              onPress={() => void loadReplies(replyPage + 1, true)}
            >
              {repliesLoading ? t('comment.loadingShort') : t('comment.moreReplies')}
            </Button>
          ) : null}
        </div>
      ) : null}

      {replyTarget ? (
        <div className={styles.replyComposer}>
          <CommentComposer
            autoFocus
            placeholder={t('comment.replyPlaceholder', { name: replyTarget.author.name })}
            onCancel={() => setReplyTarget(undefined)}
            onSubmit={handleReplySubmit}
          />
        </div>
      ) : null}
    </div>
  );
}

export default ResourceCommentThread;
