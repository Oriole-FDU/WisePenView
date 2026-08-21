import AppAvatar from '@/components/Avatar';
import { AppButton } from '@/components/Button';
import AppIconButton from '@/components/Button/AppIconButton';
import { EmojiPicker } from '@/components/Input';
import AppAlertDialog from '@/components/Overlay/AppAlertDialog';
import AppDisplayDialog from '@/components/Overlay/AppDisplayDialog';
import AppModal from '@/components/Overlay/AppModal';
import type { InlineCommentItem, InlineCommentReactionGroup } from '@/domains/InlineComment';
import { useApi } from '@/hooks/useApi';
import { parseErrorMessage } from '@/utils/error';
import { formatRelativeTimestamp, formatTimestampToDateTime } from '@/utils/format/formatTime';
import { Chip, toast } from '@heroui/react';

import { useVirtualizer } from '@tanstack/react-virtual';
import { Check, RotateCcw, Trash2, X } from 'lucide-react';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import CommentComposer from './CommentComposer';
import type {
  InlineCommentDeletePayload,
  InlineCommentProps,
  InlineCommentReactionPayload,
  InlineCommentThreadView,
} from './index.type';
import styles from './style.module.less';

const INLINE_THREAD_ESTIMATE_SIZE = 240;
const INLINE_RESOLVED_THREAD_ESTIMATE_SIZE = 180;
const INLINE_THREAD_OVERSCAN = 6;

function getAuthorInitial(name: string): string {
  return name.trim().slice(0, 1).toUpperCase() || '?';
}

function hasVisibleContent(content: string): boolean {
  return Boolean(content.replace(/\u200B/g, '').trim());
}

function formatRelativeTime(timestamp: number, locale: string): string | undefined {
  if (!Number.isFinite(new Date(timestamp).getTime())) return undefined;
  return formatRelativeTimestamp(timestamp, locale);
}

function formatReactionUsers(
  group: InlineCommentReactionGroup,
  locale: string,
  fallbackText: string
): string {
  const users = group.users.map((user) => user.name).filter(Boolean);
  return users.length > 0
    ? new Intl.ListFormat(locale, { style: 'long', type: 'conjunction' }).format(users)
    : fallbackText;
}

interface CommentItemProps {
  threadId: string;
  item: InlineCommentItem;
  active: boolean;
  canDelete: boolean;
  onReactionChange(payload: InlineCommentReactionPayload): Promise<void>;
  onDelete(payload: InlineCommentDeletePayload): void;
  onPreviewImage(url: string): void;
}

function CommentItem({
  threadId,
  item,
  active,
  canDelete,
  onReactionChange,
  onDelete,
  onPreviewImage,
}: CommentItemProps) {
  const { t, i18n } = useTranslation('common');
  const locale = i18n.resolvedLanguage === 'en-US' ? 'en-US' : 'zh-CN';
  const { loading: changingReaction, runAsync: changeReaction } = useApi(
    async (emoji: string) => {
      const selectedGroup = item.reactionGroups.find((group) => group.emoji === emoji);
      await onReactionChange({
        threadId,
        itemId: item.itemId,
        emoji,
        selected: selectedGroup?.reactedByCurrentUser ?? false,
      });
    },
    {
      manual: true,
    }
  );

  const handleEmojiSelect = (emoji: string) => {
    void changeReaction(emoji);
  };

  const formattedTime = formatTimestampToDateTime(item.createdAt) || t('inlineComment.timeUnknown');
  const date = new Date(item.createdAt);
  const dateTime = Number.isFinite(date.getTime()) ? date.toISOString() : undefined;

  return (
    <div className={styles.comment}>
      <AppAvatar aria-label={item.author.name} className={styles.avatar}>
        {item.author.avatar ? (
          <AppAvatar.Image src={item.author.avatar} alt={item.author.name} />
        ) : null}
        <AppAvatar.Fallback>{getAuthorInitial(item.author.name)}</AppAvatar.Fallback>
      </AppAvatar>
      <div className={styles.commentBody}>
        <div className={styles.commentHeader}>
          <div className={styles.authorMeta}>
            <strong>{item.author.name}</strong>
            <time dateTime={dateTime} title={formattedTime}>
              {formatRelativeTime(item.createdAt, locale) ?? t('inlineComment.timeUnknown')}
            </time>
          </div>
          {active ? (
            <div className={styles.commentActions}>
              <EmojiPicker
                label={t('inlineComment.respond', { name: item.author.name })}
                disabled={changingReaction}
                onSelect={handleEmojiSelect}
              />
              {canDelete ? (
                <AppIconButton
                  icon={<Trash2 size={15} aria-hidden />}
                  label={t('inlineComment.deleteComment')}
                  size="sm"
                  className={styles.iconButton}
                  tooltip={{ content: t('actions.delete') }}
                  onPress={() => onDelete({ threadId, itemId: item.itemId })}
                />
              ) : null}
            </div>
          ) : null}
        </div>
        {hasVisibleContent(item.content) ? (
          <p className={styles.commentContent}>{item.content}</p>
        ) : null}
        {item.imageUrls.length > 0 ? (
          <div className={styles.commentImages}>
            {item.imageUrls.map((url, index) => (
              <button
                key={`${url}-${index}`}
                type="button"
                className={styles.commentImageButton}
                aria-label={t('inlineComment.previewImageAria')}
                onClick={() => onPreviewImage(url)}
              >
                <img src={url} alt={t('inlineComment.imageAlt')} loading="lazy" />
              </button>
            ))}
          </div>
        ) : null}
        {item.reactionGroups.length > 0 ? (
          <div className={styles.reactions}>
            {item.reactionGroups.flatMap((group) => {
              const reactionUsers = formatReactionUsers(
                group,
                locale,
                t('inlineComment.reactionCount', { count: group.count })
              );
              const reactionItems =
                group.users.length > 0
                  ? group.users.map((user, index) => ({
                      key: `${group.emoji}-${user.name}-${index}`,
                      label: user.name,
                    }))
                  : [{ key: group.emoji, label: String(group.count) }];

              return reactionItems.map((reactionItem) => (
                <button
                  key={reactionItem.key}
                  type="button"
                  disabled={changingReaction}
                  className={`${styles.reaction} ${
                    group.reactedByCurrentUser ? styles.reactionSelected : ''
                  }`}
                  aria-label={t(
                    group.reactedByCurrentUser
                      ? 'inlineComment.reactionRemove'
                      : 'inlineComment.reactionAdd',
                    {
                      users: reactionUsers,
                      emoji: group.emoji,
                    }
                  )}
                  onClick={() => handleEmojiSelect(group.emoji)}
                >
                  <Chip
                    variant="soft"
                    className={`${styles.reactionChip} ${
                      group.reactedByCurrentUser ? styles.reactionChipSelected : ''
                    }`}
                  >
                    <span aria-hidden>{group.emoji}</span>
                    <Chip.Label className={styles.reactionUser}>{reactionItem.label}</Chip.Label>
                  </Chip>
                </button>
              ));
            })}
          </div>
        ) : null}
      </div>
    </div>
  );
}

interface CommentThreadProps extends Pick<
  InlineCommentProps,
  | 'activeThreadId'
  | 'currentUserId'
  | 'resourceOwnerId'
  | 'imageUpload'
  | 'onThreadSelect'
  | 'onReply'
  | 'onReactionChange'
  | 'onResolve'
> {
  thread: InlineCommentThreadView;
  onDelete(payload: InlineCommentDeletePayload): void;
  onPreviewImage(url: string): void;
}

interface ResolvedCommentThreadProps {
  thread: InlineCommentThreadView;
  currentUserId?: string;
  resourceOwnerId?: string | null;
  onReopen(threadId: string): Promise<void>;
  onDelete(payload: InlineCommentDeletePayload): void;
  onPreviewImage(url: string): void;
}

function ResolvedCommentThread({
  thread,
  currentUserId,
  resourceOwnerId,
  onReopen,
  onDelete,
  onPreviewImage,
}: ResolvedCommentThreadProps) {
  const { t } = useTranslation('common');
  const { loading: reopening, runAsync: reopen } = useApi(async () => onReopen(thread.threadId), {
    manual: true,
    onSuccess: () => toast.success(t('inlineComment.reopened')),
  });
  const deletableItem = thread.items[thread.items.length - 1];
  const canDelete = Boolean(
    deletableItem &&
    currentUserId &&
    (currentUserId === deletableItem.authorId || currentUserId === resourceOwnerId)
  );

  return (
    <article className={styles.resolvedThread}>
      <blockquote className={`${styles.quoteButton} ${styles.resolvedQuote}`}>
        <span className={styles.quoteText}>{thread.quoteText}</span>
      </blockquote>
      <div className={styles.commentList}>
        {thread.items.map((item) => (
          <CommentItem
            key={item.itemId}
            threadId={thread.threadId}
            item={item}
            active={false}
            canDelete={false}
            onReactionChange={async () => undefined}
            onDelete={onDelete}
            onPreviewImage={onPreviewImage}
          />
        ))}
      </div>
      <div className={styles.resolvedActions}>
        <AppButton
          variant="ghost"
          size="sm"
          isDisabled={reopening}
          className={styles.reopenButton}
          aria-busy={reopening || undefined}
          onPress={() => void reopen()}
        >
          <RotateCcw size={14} aria-hidden />
          {t('inlineComment.reopen')}
        </AppButton>
        {canDelete ? (
          <AppIconButton
            icon={<Trash2 size={15} aria-hidden />}
            label={t('inlineComment.deleteComment')}
            size="sm"
            className={styles.iconButton}
            tooltip={{ content: t('actions.delete') }}
            onPress={() => {
              if (deletableItem) {
                onDelete({ threadId: thread.threadId, itemId: deletableItem.itemId });
              }
            }}
          />
        ) : null}
      </div>
    </article>
  );
}

function CommentThread({
  thread,
  activeThreadId,
  currentUserId,
  resourceOwnerId,
  imageUpload,
  onThreadSelect,
  onReply,
  onReactionChange,
  onResolve,
  onDelete,
  onPreviewImage,
}: CommentThreadProps) {
  const { t } = useTranslation('common');
  const active = thread.threadId === activeThreadId;
  const { loading: resolving, runAsync: resolve } = useApi(async () => onResolve(thread.threadId), {
    manual: true,
    onSuccess: () => toast.success(t('inlineComment.resolved')),
  });

  return (
    <article className={`${styles.thread} ${active ? styles.threadActive : ''}`}>
      <div className={styles.threadHeader}>
        <button
          type="button"
          className={styles.quoteButton}
          aria-pressed={active}
          onClick={() => onThreadSelect(thread.threadId)}
        >
          <span className={styles.quoteText}>{thread.quoteText}</span>
        </button>
        {active ? (
          <AppIconButton
            icon={<Check size={16} aria-hidden />}
            label={t('inlineComment.resolveComment')}
            size="sm"
            isDisabled={resolving}
            className={styles.resolveButton}
            tooltip={{ content: t('inlineComment.resolve') }}
            aria-busy={resolving || undefined}
            onPress={() => void resolve()}
          />
        ) : null}
      </div>
      <div className={styles.commentList}>
        {thread.items.map((item) => (
          <CommentItem
            key={item.itemId}
            threadId={thread.threadId}
            item={item}
            active={active}
            canDelete={
              Boolean(currentUserId) &&
              (currentUserId === item.authorId || currentUserId === resourceOwnerId)
            }
            onReactionChange={onReactionChange}
            onDelete={onDelete}
            onPreviewImage={onPreviewImage}
          />
        ))}
      </div>
      {active ? (
        <CommentComposer
          placeholder={t('inlineComment.reply')}
          imageUpload={imageUpload}
          onSubmit={(payload) => onReply(thread.threadId, payload)}
        />
      ) : null}
    </article>
  );
}

function InlineComment({
  threads,
  resolvedThreads,
  loading,
  error,
  draft,
  activeThreadId,
  isHistoryOpen,
  currentUserId,
  resourceOwnerId,
  imageUpload,
  onHistoryOpenChange,
  onDraftClose,
  onThreadSelect,
  onCreate,
  onReply,
  onReactionChange,
  onResolve,
  onReopen,
  onDelete,
}: InlineCommentProps) {
  const { t } = useTranslation('common');
  const [pendingDeletion, setPendingDeletion] = useState<InlineCommentDeletePayload>();
  const [previewImageUrl, setPreviewImageUrl] = useState<string>();
  const threadListRef = useRef<HTMLDivElement>(null);
  const resolvedListRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line react-hooks/incompatible-library -- 批注线程包含回复、图片与编辑器，虚拟列表需要动态测量真实高度。
  const threadVirtualizer = useVirtualizer({
    count: threads.length,
    getScrollElement: () => threadListRef.current,
    estimateSize: () => INLINE_THREAD_ESTIMATE_SIZE,
    overscan: INLINE_THREAD_OVERSCAN,
    getItemKey: (index) => threads[index]?.threadId ?? index,
  });
  const virtualThreads = threadVirtualizer.getVirtualItems();
  const virtualThreadTopPadding = virtualThreads[0]?.start ?? 0;
  const virtualThreadBottomPadding =
    virtualThreads.length > 0
      ? threadVirtualizer.getTotalSize() - (virtualThreads[virtualThreads.length - 1]?.end ?? 0)
      : 0;
  const resolvedThreadVirtualizer = useVirtualizer({
    count: resolvedThreads.length,
    getScrollElement: () => resolvedListRef.current,
    estimateSize: () => INLINE_RESOLVED_THREAD_ESTIMATE_SIZE,
    overscan: INLINE_THREAD_OVERSCAN,
    getItemKey: (index) => resolvedThreads[index]?.threadId ?? index,
  });
  const virtualResolvedThreads = resolvedThreadVirtualizer.getVirtualItems();
  const virtualResolvedTopPadding = virtualResolvedThreads[0]?.start ?? 0;
  const virtualResolvedBottomPadding =
    virtualResolvedThreads.length > 0
      ? resolvedThreadVirtualizer.getTotalSize() -
        (virtualResolvedThreads[virtualResolvedThreads.length - 1]?.end ?? 0)
      : 0;
  const { loading: deleting, runAsync: deleteComment } = useApi(
    async () => {
      if (!pendingDeletion) return;
      await onDelete(pendingDeletion);
    },
    {
      manual: true,
      onSuccess: () => {
        setPendingDeletion(undefined);
        toast.success(t('inlineComment.deleted'));
      },
    }
  );

  return (
    <div className={styles.panel}>
      <div className={styles.threadList} ref={threadListRef}>
        {loading && threads.length === 0 ? (
          <p className={styles.stateText}>{t('inlineComment.loading')}</p>
        ) : null}
        {error ? <p className={styles.errorText}>{parseErrorMessage(error)}</p> : null}
        {!loading && !error && threads.length === 0 && !draft ? (
          <p className={styles.stateText}>{t('inlineComment.empty')}</p>
        ) : null}

        {draft ? (
          <article className={`${styles.thread} ${styles.threadActive}`}>
            <div className={styles.threadHeader}>
              <blockquote className={`${styles.quoteButton} ${styles.draftQuote}`}>
                <span className={styles.quoteText}>{draft.quoteText}</span>
              </blockquote>
              <AppIconButton
                icon={<X size={15} aria-hidden />}
                label={t('inlineComment.closeEditor')}
                size="sm"
                className={styles.iconButton}
                tooltip={{ content: t('actions.close') }}
                onPress={onDraftClose}
              />
            </div>
            <CommentComposer
              key={draft.key}
              placeholder={t('inlineComment.addComment')}
              imageUpload={imageUpload}
              onCancel={onDraftClose}
              onSubmit={onCreate}
            />
          </article>
        ) : null}

        {virtualThreadTopPadding > 0 ? (
          <div
            className={styles.virtualSpacer}
            style={{ height: virtualThreadTopPadding }}
            aria-hidden
          />
        ) : null}
        {virtualThreads.map((virtualThread) => {
          const thread = threads[virtualThread.index];
          if (!thread) return null;
          return (
            <div
              key={thread.threadId}
              data-index={virtualThread.index}
              ref={threadVirtualizer.measureElement}
            >
              <CommentThread
                thread={thread}
                activeThreadId={activeThreadId}
                currentUserId={currentUserId}
                resourceOwnerId={resourceOwnerId}
                imageUpload={imageUpload}
                onThreadSelect={onThreadSelect}
                onReply={onReply}
                onReactionChange={onReactionChange}
                onResolve={onResolve}
                onDelete={setPendingDeletion}
                onPreviewImage={setPreviewImageUrl}
              />
            </div>
          );
        })}
        {virtualThreadBottomPadding > 0 ? (
          <div
            className={styles.virtualSpacer}
            style={{ height: virtualThreadBottomPadding }}
            aria-hidden
          />
        ) : null}
      </div>

      <AppAlertDialog
        type="danger"
        isOpen={Boolean(pendingDeletion)}
        onOpenChange={(open) => {
          if (!open && !deleting) setPendingDeletion(undefined);
        }}
        title={t('inlineComment.deleteComment')}
        description={t('inlineComment.deleteDescription')}
        confirmText={t('actions.delete')}
        isConfirmLoading={deleting}
        isConfirmDisabled={!pendingDeletion}
        onConfirm={() => void deleteComment()}
      />

      <AppModal
        isOpen={isHistoryOpen}
        onOpenChange={onHistoryOpenChange}
        title={t('inlineComment.historyTitle')}
        size="md"
        bodyClassName={styles.historyBody}
        footer={false}
      >
        {loading && resolvedThreads.length === 0 ? (
          <p className={styles.stateText}>{t('inlineComment.historyLoading')}</p>
        ) : null}
        {error ? <p className={styles.errorText}>{parseErrorMessage(error)}</p> : null}
        {!loading && !error && resolvedThreads.length === 0 ? (
          <p className={styles.stateText}>{t('inlineComment.historyEmpty')}</p>
        ) : null}
        {resolvedThreads.length > 0 ? (
          <div className={styles.resolvedList} ref={resolvedListRef}>
            {virtualResolvedTopPadding > 0 ? (
              <div
                className={styles.virtualSpacer}
                style={{ height: virtualResolvedTopPadding }}
                aria-hidden
              />
            ) : null}
            {virtualResolvedThreads.map((virtualThread) => {
              const thread = resolvedThreads[virtualThread.index];
              if (!thread) return null;
              return (
                <div
                  key={thread.threadId}
                  data-index={virtualThread.index}
                  ref={resolvedThreadVirtualizer.measureElement}
                >
                  <ResolvedCommentThread
                    thread={thread}
                    currentUserId={currentUserId}
                    resourceOwnerId={resourceOwnerId}
                    onReopen={async (threadId) => {
                      await onReopen(threadId);
                      onHistoryOpenChange(false);
                    }}
                    onDelete={setPendingDeletion}
                    onPreviewImage={setPreviewImageUrl}
                  />
                </div>
              );
            })}
            {virtualResolvedBottomPadding > 0 ? (
              <div
                className={styles.virtualSpacer}
                style={{ height: virtualResolvedBottomPadding }}
                aria-hidden
              />
            ) : null}
          </div>
        ) : null}
      </AppModal>

      <AppDisplayDialog
        isOpen={Boolean(previewImageUrl)}
        onOpenChange={(open) => {
          if (!open) setPreviewImageUrl(undefined);
        }}
        title={t('inlineComment.imageTitle')}
        size="lg"
      >
        {previewImageUrl ? (
          <img
            className={styles.previewImage}
            src={previewImageUrl}
            alt={t('inlineComment.imagePreviewAlt')}
          />
        ) : null}
      </AppDisplayDialog>
    </div>
  );
}

export type * from './index.type';
export default InlineComment;
