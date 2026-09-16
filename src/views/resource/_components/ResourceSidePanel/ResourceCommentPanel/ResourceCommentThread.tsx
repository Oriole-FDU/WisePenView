import { useVirtualizer } from '@tanstack/react-virtual';
import { useInfiniteScroll } from 'ahooks';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { type RefObject, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { AppButton } from '@/components/base/Button';
import { useInteractService } from '@/domains';
import type { ResourceComment } from '@/domains/Interact';
import { parseErrorMessage } from '@/utils/error';

import CommentComposer from './CommentComposer';
import ResourceCommentItem from './ResourceCommentItem';
import styles from './style.module.less';
import { updateCommentLikeCount } from './utils';

const REPLY_PAGE_SIZE = 10;
const REPLY_ITEM_ESTIMATE_SIZE = 132;
const REPLY_ITEM_OVERSCAN = 6;

interface ReplyListPage {
  list: ResourceComment[];
  total: number;
  totalPage: number;
}

interface ResourceCommentThreadProps {
  dataIndex: number;
  measureElement: (element: Element | null) => void;
  scrollElementRef: RefObject<HTMLDivElement | null>;
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
  dataIndex,
  measureElement,
  scrollElementRef,
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
  const [replyTarget, setReplyTarget] = useState<ResourceComment>();

  const {
    data: replyPageData,
    error: repliesError,
    loading: repliesLoading,
    loadingMore: repliesLoadingMore,
    noMore: repliesNoMore,
    loadMore: loadMoreReplies,
    reload: reloadReplies,
    reloadAsync: reloadRepliesAsync,
    mutate: mutateReplies,
  } = useInfiniteScroll<ReplyListPage>(
    async (current) => {
      const nextPage = Math.floor((current?.list.length ?? 0) / REPLY_PAGE_SIZE) + 1;
      const data = await interactService.listReplies({
        rootCommentId: rootComment.commentId,
        page: nextPage,
        size: REPLY_PAGE_SIZE,
      });
      return {
        list: data.items,
        total: data.total,
        totalPage: data.totalPage,
      };
    },
    {
      manual: true,
      isNoMore: (data) => Boolean(data && (data.total === 0 || data.list.length >= data.total)),
    }
  );

  /**
   * @wisepen-manual-effect
   * 执行时机：根评论变化时清空回复缓存，避免复用组件时显示旧线程回复。
   * 不可替代原因：useInfiniteScroll 不会根据业务主键自动丢弃已累积列表。
   * cleanup：没有持续订阅或延迟任务，无需清理。
   */
  useEffect(() => {
    mutateReplies(undefined);
  }, [rootComment.commentId, mutateReplies]);

  const replies = replyPageData?.list ?? [];
  // eslint-disable-next-line react-hooks/incompatible-library -- 回复内容含图片且高度不固定，虚拟列表需要动态测量真实高度。
  const replyVirtualizer = useVirtualizer({
    count: replies.length,
    getScrollElement: () => scrollElementRef.current,
    estimateSize: () => REPLY_ITEM_ESTIMATE_SIZE,
    overscan: REPLY_ITEM_OVERSCAN,
    getItemKey: (index) => replies[index]?.commentId ?? index,
  });
  const virtualReplies = replyVirtualizer.getVirtualItems();
  const virtualReplyTopPadding = virtualReplies[0]?.start ?? 0;
  const virtualReplyBottomPadding =
    virtualReplies.length > 0
      ? replyVirtualizer.getTotalSize() - (virtualReplies[virtualReplies.length - 1]?.end ?? 0)
      : 0;

  const handleToggleReplies = () => {
    if (expanded) {
      setExpanded(false);
      return;
    }
    setExpanded(true);
    if (!replyPageData?.list.length) reloadReplies();
  };

  const handleReplyLike = async (reply: ResourceComment) => {
    const wasLiked = likedCommentIds.has(reply.commentId);
    const liked = await onLike(reply);
    if (liked !== wasLiked) {
      mutateReplies((current) =>
        current
          ? {
              ...current,
              list: updateCommentLikeCount(current.list, reply.commentId, liked),
            }
          : current
      );
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
    await reloadRepliesAsync();
    await onCommentsChanged();
  };

  return (
    <div className={styles.commentThread} data-index={dataIndex} ref={measureElement}>
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
        <AppButton
          variant="ghost"
          size="sm"
          className={styles.replyToggle}
          onPress={handleToggleReplies}
        >
          {expanded ? <ChevronUp size={14} aria-hidden /> : <ChevronDown size={14} aria-hidden />}
          {expanded
            ? t('comment.collapseReplies')
            : t('comment.replyCount', { count: rootComment.replyCount })}
        </AppButton>
      ) : null}

      {expanded ? (
        <div className={styles.replyList}>
          {repliesLoading && !replyPageData?.list.length ? (
            <p className={styles.mutedText}>{t('comment.loadingReplies')}</p>
          ) : null}
          {virtualReplyTopPadding > 0 ? (
            <div
              className={styles.virtualSpacer}
              style={{ height: virtualReplyTopPadding }}
              aria-hidden
            />
          ) : null}
          {virtualReplies.map((virtualReply) => {
            const reply = replies[virtualReply.index];
            if (!reply) return null;
            return (
              <div
                key={reply.commentId}
                data-index={virtualReply.index}
                ref={replyVirtualizer.measureElement}
              >
                <ResourceCommentItem
                  comment={reply}
                  currentUserId={currentUserId}
                  resourceOwnerId={resourceOwnerId}
                  liked={likedCommentIds.has(reply.commentId)}
                  likePending={pendingLikeIds.has(reply.commentId)}
                  onReply={setReplyTarget}
                  onLike={handleReplyLike}
                  onDelete={(comment) =>
                    onDelete(comment, async () => {
                      await reloadRepliesAsync();
                    })
                  }
                  onPreviewImage={onPreviewImage}
                />
              </div>
            );
          })}
          {virtualReplyBottomPadding > 0 ? (
            <div
              className={styles.virtualSpacer}
              style={{ height: virtualReplyBottomPadding }}
              aria-hidden
            />
          ) : null}
          {repliesError ? (
            <p className={styles.errorText}>{parseErrorMessage(repliesError)}</p>
          ) : null}
          {replyPageData && !repliesNoMore ? (
            <AppButton
              variant="ghost"
              size="sm"
              className={styles.loadMoreButton}
              isDisabled={repliesLoadingMore}
              onPress={loadMoreReplies}
            >
              {repliesLoadingMore ? t('comment.loadingShort') : t('comment.moreReplies')}
            </AppButton>
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
