import AppAvatar from '@/components/Avatar';
import AppIconButton from '@/components/Button/AppIconButton';
import AppAlertDialog from '@/components/Overlay/AppAlertDialog';
import AppDisplayDialog from '@/components/Overlay/AppDisplayDialog';
import AppModal from '@/components/Overlay/AppModal';
import type { InlineCommentItem, InlineCommentReactionGroup } from '@/domains/InlineComment';
import { parseErrorMessage } from '@/utils/error';
import { formatTimestampToDateTime } from '@/utils/format/formatTime';
import { Button, toast } from '@heroui/react';
import { useRequest } from 'ahooks';
import { Check, RotateCcw, Trash2, X } from 'lucide-react';
import { useState } from 'react';

import CommentComposer from './CommentComposer';
import EmojiPicker from './EmojiPicker';
import type {
  InlineCommentDeletePayload,
  InlineCommentProps,
  InlineCommentReactionPayload,
  InlineCommentThreadView,
} from './index.type';
import styles from './style.module.less';

function getAuthorInitial(name: string): string {
  return name.trim().slice(0, 1).toUpperCase() || '?';
}

function hasVisibleContent(content: string): boolean {
  return Boolean(content.replace(/\u200B/g, '').trim());
}

function formatRelativeTime(timestamp: number): string {
  const elapsedSeconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1_000));
  if (elapsedSeconds < 60) return '刚刚';
  const elapsedMinutes = Math.floor(elapsedSeconds / 60);
  if (elapsedMinutes < 60) return `${elapsedMinutes} 分钟前`;
  const elapsedHours = Math.floor(elapsedMinutes / 60);
  if (elapsedHours < 24) return `${elapsedHours} 小时前`;
  const elapsedDays = Math.floor(elapsedHours / 24);
  if (elapsedDays < 7) return `${elapsedDays} 天前`;
  return formatTimestampToDateTime(timestamp) || '时间未知';
}

function getReactionLabel(group: InlineCommentReactionGroup): string {
  const users = group.users.map((user) => user.name).filter(Boolean);
  const usersText = users.length > 0 ? users.join('、') : `${group.count} 人`;
  return `${usersText}${group.reactedByCurrentUser ? '，点击取消' : '，点击添加'} ${group.emojiId}`;
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
  const { loading: changingReaction, runAsync: changeReaction } = useRequest(
    async (emojiId?: string) => onReactionChange({ threadId, itemId: item.itemId, emojiId }),
    {
      manual: true,
      onError: (error) => toast.danger(parseErrorMessage(error)),
    }
  );

  const handleEmojiSelect = (emojiId: string) => {
    const selectedGroup = item.reactionGroups.find((group) => group.emojiId === emojiId);
    void changeReaction(selectedGroup?.reactedByCurrentUser ? undefined : emojiId);
  };

  const formattedTime = formatTimestampToDateTime(item.createdAt) || '时间未知';
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
              {formatRelativeTime(item.createdAt)}
            </time>
          </div>
          {active ? (
            <div className={styles.commentActions}>
              <EmojiPicker
                label={`回应 ${item.author.name}`}
                disabled={changingReaction}
                onSelect={handleEmojiSelect}
              />
              {canDelete ? (
                <AppIconButton
                  icon={<Trash2 size={15} aria-hidden />}
                  label="删除批注"
                  size="sm"
                  className={styles.iconButton}
                  tooltip={{ content: '删除' }}
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
                aria-label="预览批注图片"
                onClick={() => onPreviewImage(url)}
              >
                <img src={url} alt="批注图片" loading="lazy" />
              </button>
            ))}
          </div>
        ) : null}
        {item.reactionGroups.length > 0 ? (
          <div className={styles.reactions}>
            {item.reactionGroups.map((group) => (
              <button
                key={group.emojiId}
                type="button"
                disabled={changingReaction}
                className={`${styles.reaction} ${
                  group.reactedByCurrentUser ? styles.reactionSelected : ''
                }`}
                aria-label={getReactionLabel(group)}
                onClick={() => handleEmojiSelect(group.emojiId)}
              >
                <span aria-hidden>{group.emojiId}</span>
                <span>{group.count}</span>
              </button>
            ))}
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
  const { loading: reopening, runAsync: reopen } = useRequest(
    async () => onReopen(thread.threadId),
    {
      manual: true,
      onSuccess: () => toast.success('批注已重新打开'),
      onError: (error) => toast.danger(parseErrorMessage(error)),
    }
  );
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
        <Button
          variant="ghost"
          size="sm"
          isDisabled={reopening}
          className={styles.reopenButton}
          aria-busy={reopening || undefined}
          onPress={() => void reopen()}
        >
          <RotateCcw size={14} aria-hidden />
          重新打开
        </Button>
        {canDelete ? (
          <AppIconButton
            icon={<Trash2 size={15} aria-hidden />}
            label="删除批注"
            size="sm"
            className={styles.iconButton}
            tooltip={{ content: '删除' }}
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
  const active = thread.threadId === activeThreadId;
  const { loading: resolving, runAsync: resolve } = useRequest(
    async () => onResolve(thread.threadId),
    {
      manual: true,
      onSuccess: () => toast.success('批注已解决'),
      onError: (error) => toast.danger(parseErrorMessage(error)),
    }
  );

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
            label="解决批注"
            size="sm"
            isDisabled={resolving}
            className={styles.resolveButton}
            tooltip={{ content: '解决' }}
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
          placeholder="回复"
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
  const [pendingDeletion, setPendingDeletion] = useState<InlineCommentDeletePayload>();
  const [previewImageUrl, setPreviewImageUrl] = useState<string>();
  const { loading: deleting, runAsync: deleteComment } = useRequest(
    async () => {
      if (!pendingDeletion) return;
      await onDelete(pendingDeletion);
    },
    {
      manual: true,
      onSuccess: () => {
        setPendingDeletion(undefined);
        toast.success('批注已删除');
      },
      onError: (deleteError) => toast.danger(parseErrorMessage(deleteError)),
    }
  );

  return (
    <div className={styles.panel}>
      <div className={styles.threadList}>
        {loading && threads.length === 0 ? (
          <p className={styles.stateText}>正在加载批注...</p>
        ) : null}
        {error ? <p className={styles.errorText}>{parseErrorMessage(error)}</p> : null}
        {!loading && !error && threads.length === 0 && !draft ? (
          <p className={styles.stateText}>还没有行内批注</p>
        ) : null}

        {draft ? (
          <article className={`${styles.thread} ${styles.threadActive}`}>
            <div className={styles.threadHeader}>
              <blockquote className={`${styles.quoteButton} ${styles.draftQuote}`}>
                <span className={styles.quoteText}>{draft.quoteText}</span>
              </blockquote>
              <AppIconButton
                icon={<X size={15} aria-hidden />}
                label="关闭批注编辑器"
                size="sm"
                className={styles.iconButton}
                tooltip={{ content: '关闭' }}
                onPress={onDraftClose}
              />
            </div>
            <CommentComposer
              key={draft.key}
              placeholder="添加批注"
              imageUpload={imageUpload}
              onSubmit={onCreate}
            />
          </article>
        ) : null}

        {threads.map((thread) => (
          <CommentThread
            key={thread.threadId}
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
        ))}
      </div>

      <AppAlertDialog
        type="danger"
        isOpen={Boolean(pendingDeletion)}
        onOpenChange={(open) => {
          if (!open && !deleting) setPendingDeletion(undefined);
        }}
        title="删除批注"
        description="删除后无法恢复，确定继续吗？"
        confirmText="删除"
        isConfirmLoading={deleting}
        isConfirmDisabled={!pendingDeletion}
        onConfirm={() => void deleteComment()}
      />

      <AppModal
        isOpen={isHistoryOpen}
        onOpenChange={onHistoryOpenChange}
        title="历史评论"
        size="md"
        bodyClassName={styles.historyBody}
        footer={false}
      >
        {loading && resolvedThreads.length === 0 ? (
          <p className={styles.stateText}>正在加载历史评论...</p>
        ) : null}
        {error ? <p className={styles.errorText}>{parseErrorMessage(error)}</p> : null}
        {!loading && !error && resolvedThreads.length === 0 ? (
          <p className={styles.stateText}>还没有已解决的评论</p>
        ) : null}
        {resolvedThreads.length > 0 ? (
          <div className={styles.resolvedList}>
            {resolvedThreads.map((thread) => (
              <ResolvedCommentThread
                key={thread.threadId}
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
            ))}
          </div>
        ) : null}
      </AppModal>

      <AppDisplayDialog
        isOpen={Boolean(previewImageUrl)}
        onOpenChange={(open) => {
          if (!open) setPreviewImageUrl(undefined);
        }}
        title="批注图片"
        size="lg"
      >
        {previewImageUrl ? (
          <img className={styles.previewImage} src={previewImageUrl} alt="批注图片预览" />
        ) : null}
      </AppDisplayDialog>
    </div>
  );
}

export type * from './index.type';
export default InlineComment;
