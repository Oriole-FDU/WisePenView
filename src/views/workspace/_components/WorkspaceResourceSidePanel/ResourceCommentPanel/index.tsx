import AppAlertDialog from '@/components/Overlay/AppAlertDialog';
import AppDisplayDialog from '@/components/Overlay/AppDisplayDialog';
import SegmentedTabs from '@/components/SegmentedTabs';
import { useInteractService, useUserService } from '@/domains';
import type { CommentSortBy, ResourceComment } from '@/domains/Interact';
import type { ResourceItem } from '@/domains/Resource';
import { parseErrorMessage } from '@/utils/error';
import { Button, Separator, toast } from '@heroui/react';
import { useRequest } from 'ahooks';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import ResourceFavoriteAction from '../../ResourceFavoriteAction';
import CommentComposer from './CommentComposer';
import ResourceCommentThread from './ResourceCommentThread';
import ResourceFeedbackSummary from './ResourceFeedbackSummary';
import styles from './style.module.less';
import { updateCommentLikeCount } from './utils';

const COMMENT_PAGE_SIZE = 10;
const EMPTY_LIKED_COMMENT_IDS = new Set<string>();
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

interface OptimisticScoreState {
  resourceId: string;
  baseScore: number;
  score: number;
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
  const [optimisticScore, setOptimisticScore] = useState<OptimisticScoreState>();
  const [commentLikeIds, setCommentLikeIds] = useState<ReadonlySet<string>>();
  const [pendingLikeIds, setPendingLikeIds] = useState<ReadonlySet<string>>(new Set());
  const [comments, setComments] = useState<ResourceComment[]>([]);
  const [commentPage, setCommentPage] = useState(1);
  const [sortBy, setSortBy] = useState<CommentSortBy>('CREATE_TIME');
  const [pendingDeletion, setPendingDeletion] = useState<PendingDeletion>();
  const [previewImageUrl, setPreviewImageUrl] = useState<string>();

  const { data: currentUser } = useRequest(() => userService.getUserInfo());
  const { data: interaction, refresh: refreshInteraction } = useRequest(
    () => interactService.getResourceInteraction(resourceId),
    { ready: Boolean(resourceId), refreshDeps: [resourceId] }
  );

  const notifyResourceChanged = () => {
    void Promise.resolve(onResourceChanged?.())
      .catch((error) => toast.danger(parseErrorMessage(error)))
      .finally(refreshInteraction);
  };

  const { run: submitResourceLike, loading: resourceLikePending } = useRequest(
    async (liked: boolean) => {
      await interactService.toggleResourceLike(resourceId);
      return liked;
    },
    {
      manual: true,
      onSuccess: notifyResourceChanged,
      onError: (error) => {
        setOptimisticLike(undefined);
        toast.danger(parseErrorMessage(error));
      },
    }
  );

  const { run: submitResourceScore, loading: resourceScorePending } = useRequest(
    async (score: number) => {
      await interactService.rateResource({ resourceId, score });
      return score;
    },
    {
      manual: true,
      onSuccess: notifyResourceChanged,
      onError: (error) => {
        setOptimisticScore(undefined);
        toast.danger(parseErrorMessage(error));
      },
    }
  );

  const {
    data: commentPageData,
    error: commentsError,
    loading: commentsLoading,
    runAsync: loadComments,
  } = useRequest(
    async (page: number, append: boolean, nextSortBy: CommentSortBy) => {
      const data = await interactService.listComments({
        resourceId,
        sortBy: nextSortBy,
        page,
        size: COMMENT_PAGE_SIZE,
      });
      setComments((current) => (append ? [...current, ...data.items] : data.items));
      setCommentPage(page);
      return data;
    },
    {
      defaultParams: [1, false, 'CREATE_TIME'],
      refreshDeps: [resourceId],
    }
  );

  const refreshComments = async () => {
    await loadComments(1, false, sortBy);
    notifyResourceChanged();
  };

  const likedCommentIds = commentLikeIds ?? interaction?.likedCommentIds ?? EMPTY_LIKED_COMMENT_IDS;

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
        setComments((current) => updateCommentLikeCount(current, comment.commentId, liked));
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

  const { run: confirmDelete, loading: deleting } = useRequest(
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
      onError: (error) => toast.danger(parseErrorMessage(error)),
    }
  );

  const interactionScore = interaction?.score ?? 0;
  const activeOptimisticLike =
    optimisticLike?.resourceId === resourceId && optimisticLike.baseCount === resourceLikeCount
      ? optimisticLike
      : undefined;
  const activeOptimisticScore =
    optimisticScore?.resourceId === resourceId && optimisticScore.baseScore === interactionScore
      ? optimisticScore
      : undefined;
  const commentCount = commentPageData?.total ?? resource.commentCount ?? 0;
  const hasMoreComments = Boolean(commentPageData && commentPage < commentPageData.totalPage);
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

  const handleScoreChange = (score: number) => {
    setOptimisticScore({ resourceId, baseScore: interactionScore, score });
    submitResourceScore(score);
  };

  const handleSortChange = (nextSortBy: CommentSortBy) => {
    setSortBy(nextSortBy);
    void loadComments(1, false, nextSortBy);
  };

  return (
    <div className={styles.panel}>
      <div className={styles.content}>
        <ResourceFeedbackSummary
          readCount={resource.readCount}
          favoriteCount={resource.favoriteCount}
          scoreAvg={resource.scoreAvg}
          liked={activeOptimisticLike?.liked ?? interaction?.liked ?? false}
          likeCount={activeOptimisticLike?.count ?? resourceLikeCount}
          score={activeOptimisticScore?.score ?? interactionScore}
          likePending={resourceLikePending}
          ratePending={resourceScorePending}
          onLikeChange={handleResourceLikeChange}
          onRateChange={handleScoreChange}
          favoriteAction={
            <ResourceFavoriteAction resourceId={resourceId} onSuccess={onResourceChanged} />
          }
        />

        <Separator />

        <section className={styles.commentsSection} aria-labelledby="resource-comments-title">
          <div className={styles.commentsHeader}>
            <h3 id="resource-comments-title" className={styles.sectionTitle}>
              {t('resource:comment.count', { count: commentCount })}
            </h3>
            <SegmentedTabs<CommentSortBy>
              ariaLabel={t('resource:comment.sortAria')}
              items={commentSortOptions}
              selectedKey={sortBy}
              size="sm"
              onSelectionChange={handleSortChange}
            />
          </div>

          {commentsError ? (
            <p className={styles.errorText}>{parseErrorMessage(commentsError)}</p>
          ) : null}
          {commentsLoading && comments.length === 0 ? (
            <p className={styles.mutedText}>{t('resource:comment.loading')}</p>
          ) : null}
          {!commentsLoading && comments.length === 0 ? (
            <p className={styles.emptyText}>{t('resource:comment.empty')}</p>
          ) : null}

          <div className={styles.commentList}>
            {comments.map((comment) => (
              <ResourceCommentThread
                key={comment.commentId}
                resourceId={resourceId}
                rootComment={comment}
                currentUserId={currentUser?.id}
                resourceOwnerId={resource.ownerId}
                likedCommentIds={likedCommentIds}
                pendingLikeIds={pendingLikeIds}
                onLike={toggleCommentLike}
                onDelete={(target, onDeleted) => setPendingDeletion({ comment: target, onDeleted })}
                onCommentsChanged={refreshComments}
                onPreviewImage={setPreviewImageUrl}
              />
            ))}
          </div>

          {hasMoreComments ? (
            <Button
              variant="ghost"
              size="sm"
              className={styles.loadMoreButton}
              isDisabled={commentsLoading}
              onPress={() => void loadComments(commentPage + 1, true, sortBy)}
            >
              {commentsLoading
                ? t('resource:comment.loadingShort')
                : t('resource:comment.loadMore')}
            </Button>
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
