import { Tabs, toast } from '@heroui/react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useInfiniteScroll } from 'ahooks';
import { type Key, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { AppButton } from '@/components/base/Button';
import AppAlertDialog from '@/components/business/AppAlertDialog';
import AppDisplayDialog from '@/components/business/AppDisplayDialog';
import { useInteractService, useUserService } from '@/domains';
import type { CommentSortBy, ResourceComment } from '@/domains/Interact';
import type { ResourceItem } from '@/domains/Resource';
import { useApi } from '@/hooks/useApi';
import { parseErrorMessage } from '@/utils/error';

import ResourceFavoriteAction from '../../ResourceFavoriteAction';
import CommentComposer from './CommentComposer';
import ResourceCommentThread from './ResourceCommentThread';
import ResourceFeedbackSummary from './ResourceFeedbackSummary';
import styles from './style.module.less';
import { updateCommentLikeCount } from './utils';

const COMMENT_PAGE_SIZE = 10;
const COMMENT_THREAD_ESTIMATE_SIZE = 180;
const COMMENT_THREAD_OVERSCAN = 6;
const EMPTY_LIKED_COMMENT_IDS = new Set<string>();

interface CommentListPage {
  list: ResourceComment[];
  total: number;
  totalPage: number;
}

interface ResourceCommentPanelProps {
  resource: ResourceItem;
  onResourceChanged?: () => unknown | Promise<unknown>;
}

interface OptimisticLikeState {
  resourceId: string;
  baseCount: number;
  count: number;
  liked: boolean;
}

interface PendingDeletion {
  comment: ResourceComment;
  onDeleted?: () => void | Promise<void>;
}

function ResourceCommentPanel({ resource, onResourceChanged }: ResourceCommentPanelProps) {
  const { t } = useTranslation(['resource', 'common']);
  const interactService = useInteractService();
  const userService = useUserService();
  const resourceId = resource.resourceId;
  const resourceLikeCount = resource.likeCount ?? 0;
  const [optimisticLike, setOptimisticLike] = useState<OptimisticLikeState>();
  const [commentLikeIds, setCommentLikeIds] = useState<ReadonlySet<string>>();
  const [pendingLikeIds, setPendingLikeIds] = useState<ReadonlySet<string>>(new Set());
  const [sortBy, setSortBy] = useState<CommentSortBy>('CREATE_TIME');
  const [pendingDeletion, setPendingDeletion] = useState<PendingDeletion>();
  const [previewImageUrl, setPreviewImageUrl] = useState<string>();
  const contentRef = useRef<HTMLDivElement>(null);

  const { data: currentUser } = useApi(() => userService.getUserInfo());
  const {
    data: interaction,
    loading: interactionLoading,
    refresh: refreshInteraction,
  } = useApi(() => interactService.getResourceInteraction(resourceId), {
    ready: Boolean(resourceId),
    refreshDeps: [resourceId],
  });

  const notifyResourceChanged = () => {
    void Promise.resolve(onResourceChanged?.())
      .catch((error) => toast.danger(parseErrorMessage(error)))
      .finally(refreshInteraction);
  };

  const { run: submitResourceLike, loading: resourceLikePending } = useApi(
    async (liked: boolean) => {
      await interactService.setResourceLike(resourceId, liked);
      return liked;
    },
    {
      manual: true,
      onSuccess: notifyResourceChanged,
      onErrorEffect: () => {
        setOptimisticLike(undefined);
      },
    }
  );

  const {
    data: commentPageData,
    error: commentsError,
    loading: commentsLoading,
    loadingMore: commentsLoadingMore,
    noMore: commentsNoMore,
    loadMore: loadMoreComments,
    reloadAsync: reloadComments,
    mutate: mutateComments,
  } = useInfiniteScroll<CommentListPage>(
    async (current) => {
      const nextPage = Math.floor((current?.list.length ?? 0) / COMMENT_PAGE_SIZE) + 1;
      const data = await interactService.listComments({
        resourceId,
        sortBy,
        page: nextPage,
        size: COMMENT_PAGE_SIZE,
      });
      return {
        list: data.items,
        total: data.total,
        totalPage: data.totalPage,
      };
    },
    {
      reloadDeps: [resourceId, sortBy],
      isNoMore: (data) => Boolean(data && (data.total === 0 || data.list.length >= data.total)),
    }
  );

  /**
   * @wisepen-manual-effect
   * 执行时机：资源或排序切换时先清空评论缓存，避免短暂显示旧资源的评论。
   * 不可替代原因：useInfiniteScroll 的 reloadDeps 只负责重新拉取，不会自动清理已累积列表。
   * cleanup：没有订阅或延迟任务，无需清理。
   */
  useEffect(() => {
    mutateComments(undefined);
  }, [resourceId, sortBy, mutateComments]);

  const refreshComments = async () => {
    await reloadComments();
    notifyResourceChanged();
  };

  const likedCommentIds = commentLikeIds ?? interaction?.likedCommentIds ?? EMPTY_LIKED_COMMENT_IDS;
  const comments = commentPageData?.list ?? [];
  // eslint-disable-next-line react-hooks/incompatible-library -- 评论行包含图片与展开回复，虚拟列表需要动态测量真实高度。
  const commentVirtualizer = useVirtualizer({
    count: comments.length,
    getScrollElement: () => contentRef.current,
    estimateSize: () => COMMENT_THREAD_ESTIMATE_SIZE,
    overscan: COMMENT_THREAD_OVERSCAN,
    getItemKey: (index) => comments[index]?.commentId ?? index,
  });
  const virtualComments = commentVirtualizer.getVirtualItems();
  const virtualTopPadding = virtualComments[0]?.start ?? 0;
  const virtualBottomPadding =
    virtualComments.length > 0
      ? commentVirtualizer.getTotalSize() - (virtualComments[virtualComments.length - 1]?.end ?? 0)
      : 0;

  const toggleCommentLike = async (comment: ResourceComment): Promise<boolean> => {
    const wasLiked = likedCommentIds.has(comment.commentId);
    if (pendingLikeIds.has(comment.commentId)) return wasLiked;

    setPendingLikeIds((current) => new Set(current).add(comment.commentId));
    try {
      const liked = await interactService.toggleCommentLike({
        resourceId,
        commentId: comment.commentId,
      });
      setCommentLikeIds((current) => {
        const next = new Set(current ?? likedCommentIds);
        if (liked) next.add(comment.commentId);
        else next.delete(comment.commentId);
        return next;
      });
      if (liked !== wasLiked) {
        mutateComments((current) =>
          current
            ? {
                ...current,
                list: updateCommentLikeCount(current.list, comment.commentId, liked),
              }
            : current
        );
      }
      return liked;
    } catch (error) {
      toast.danger(parseErrorMessage(error));
      return wasLiked;
    } finally {
      setPendingLikeIds((current) => {
        const next = new Set(current);
        next.delete(comment.commentId);
        return next;
      });
    }
  };

  const { run: confirmDelete, loading: deleting } = useApi(
    async () => {
      const target = pendingDeletion;
      if (!target) return;

      await interactService.deleteComment({
        resourceId,
        commentId: target.comment.commentId,
      });
      await target.onDeleted?.();
      setPendingDeletion(undefined);
      await refreshComments();
    },
    {
      manual: true,
    }
  );

  const activeOptimisticLike =
    optimisticLike?.resourceId === resourceId && optimisticLike.baseCount === resourceLikeCount
      ? optimisticLike
      : undefined;
  const commentSortOptions: Array<{ key: CommentSortBy; label: string }> = [
    { key: 'CREATE_TIME', label: t('resource:comment.sort.latest') },
    { key: 'LIKE_COUNT', label: t('resource:comment.sort.hottest') },
  ];

  const handleResourceLikeChange = (liked: boolean) => {
    const currentCount = activeOptimisticLike?.count ?? resourceLikeCount;
    setOptimisticLike({
      resourceId,
      baseCount: resourceLikeCount,
      count: Math.max(0, currentCount + (liked ? 1 : -1)),
      liked,
    });
    submitResourceLike(liked);
  };

  const handleSortChange = (nextSortBy: CommentSortBy) => {
    setSortBy(nextSortBy);
  };

  const handleSortSelectionChange = (key: Key) => {
    const nextSortBy = String(key);
    if (nextSortBy === 'CREATE_TIME' || nextSortBy === 'LIKE_COUNT') {
      handleSortChange(nextSortBy);
    }
  };

  return (
    <div className={styles.panel}>
      <header className={styles.panelHeader}>
        <h2 className={styles.panelTitle}>{t('resource:sidePanel.comments')}</h2>
      </header>

      <div className={styles.content} ref={contentRef}>
        <section
          className={styles.commentsSection}
          aria-label={t('resource:sidePanel.commentsAria')}
        >
          <div className={styles.commentsHeader}>
            <Tabs
              variant="secondary"
              selectedKey={sortBy}
              onSelectionChange={handleSortSelectionChange}
              className={styles.commentSortTabs}
            >
              <Tabs.ListContainer>
                <Tabs.List
                  className={styles.commentSortTabsList}
                  aria-label={t('resource:comment.sortAria')}
                >
                  {commentSortOptions.map((option) => (
                    <Tabs.Tab key={option.key} id={option.key} className={styles.commentSortTab}>
                      {option.label}
                      <Tabs.Indicator />
                    </Tabs.Tab>
                  ))}
                </Tabs.List>
              </Tabs.ListContainer>
            </Tabs>
            <ResourceFeedbackSummary
              readCount={resource.readCount}
              favoriteCount={resource.favoriteCount}
              liked={activeOptimisticLike?.liked ?? interaction?.liked ?? false}
              likeCount={activeOptimisticLike?.count ?? resourceLikeCount}
              likePending={interactionLoading || resourceLikePending || !interaction}
              onLikeChange={handleResourceLikeChange}
              favoriteAction={
                <ResourceFavoriteAction resourceId={resourceId} onSuccess={onResourceChanged} />
              }
            />
          </div>

          {commentsError ? (
            <p className={styles.errorText}>{parseErrorMessage(commentsError)}</p>
          ) : null}
          {commentsLoading && !commentPageData?.list.length ? (
            <p className={styles.mutedText}>{t('resource:comment.loading')}</p>
          ) : null}
          {!commentsLoading && !comments.length ? (
            <p className={styles.emptyText}>{t('resource:comment.empty')}</p>
          ) : null}

          <div className={styles.commentList}>
            {virtualTopPadding > 0 ? (
              <div
                className={styles.virtualSpacer}
                style={{ height: virtualTopPadding }}
                aria-hidden
              />
            ) : null}
            {virtualComments.map((virtualComment) => {
              const comment = comments[virtualComment.index];
              if (!comment) return null;
              return (
                <ResourceCommentThread
                  key={comment.commentId}
                  dataIndex={virtualComment.index}
                  measureElement={commentVirtualizer.measureElement}
                  scrollElementRef={contentRef}
                  resourceId={resourceId}
                  rootComment={comment}
                  currentUserId={currentUser?.id}
                  resourceOwnerId={resource.ownerId}
                  likedCommentIds={likedCommentIds}
                  pendingLikeIds={pendingLikeIds}
                  onLike={toggleCommentLike}
                  onDelete={(target, onDeleted) =>
                    setPendingDeletion({ comment: target, onDeleted })
                  }
                  onCommentsChanged={refreshComments}
                  onPreviewImage={setPreviewImageUrl}
                />
              );
            })}
            {virtualBottomPadding > 0 ? (
              <div
                className={styles.virtualSpacer}
                style={{ height: virtualBottomPadding }}
                aria-hidden
              />
            ) : null}
          </div>

          {commentPageData && !commentsNoMore ? (
            <AppButton
              variant="ghost"
              size="sm"
              className={styles.loadMoreButton}
              isDisabled={commentsLoadingMore}
              onPress={loadMoreComments}
            >
              {commentsLoadingMore
                ? t('resource:comment.loadingShort')
                : t('resource:comment.loadMore')}
            </AppButton>
          ) : null}
        </section>
      </div>

      <div className={styles.composerDock}>
        <CommentComposer
          placeholder={t('resource:comment.placeholder')}
          onSubmit={async (content, imageUrls) => {
            await interactService.createComment({ resourceId, content, imageUrls });
            await refreshComments();
          }}
        />
      </div>

      <AppAlertDialog
        type="danger"
        isOpen={Boolean(pendingDeletion)}
        onOpenChange={(open) => {
          if (!open && !deleting) setPendingDeletion(undefined);
        }}
        title={t('resource:comment.deleteDialog.title')}
        description={t('resource:comment.deleteDialog.description')}
        confirmText={t('common:actions.delete')}
        isConfirmLoading={deleting}
        isConfirmDisabled={!pendingDeletion}
        onConfirm={confirmDelete}
      />

      <AppDisplayDialog
        isOpen={Boolean(previewImageUrl)}
        onOpenChange={(open) => {
          if (!open) setPreviewImageUrl(undefined);
        }}
        title={t('resource:comment.imageDialog.title')}
        size="lg"
      >
        {previewImageUrl ? (
          <img
            className={styles.previewImage}
            src={previewImageUrl}
            alt={t('resource:comment.imageDialog.previewAlt')}
          />
        ) : null}
      </AppDisplayDialog>
    </div>
  );
}

export default ResourceCommentPanel;
