import type { ExtensionFactoryInstance } from '@blocknote/core';
import { CommentMark, CommentsExtension, YjsThreadStore } from '@blocknote/core/comments';
import type * as Y from 'yjs';
import type { Doc } from 'yjs';

import type { CustomBlockNoteEditor } from '../../blockNoteSchema';
import type { BlockNoteCommentDocumentRole } from '../comments.types';
import { bindDynamicCommentUserId } from '../core/bindDynamicCommentUserId';
import {
  getBlockNoteThreadDocumentSelectionsYMap,
  persistThreadDocumentSelection,
} from '../core/commentDocumentSelection';
import { WISEPEN_COMMENT_MARK_SYNC_META } from '../core/commentMarkSync';
import {
  getBlockNoteFormulaThreadAnchorsYMap,
  getBlockNoteThreadReferencesYMap,
} from '../core/commentThreadConstants';
import type { PendingCommentSelection } from '../core/pendingCommentReference';
import { ReadOnlyThreadStoreAuth } from '../core/readOnlyThreadStoreAuth';
import { WisePenThreadStoreAuth } from '../core/wisePenThreadStoreAuth';

export type AddThreadToDocumentArgs = {
  threadId: string;
  selection?: {
    prosemirror?: {
      anchor?: number;
      head?: number;
    };
  };
};

export function addCommentMarkToDocumentSelection(
  editor: CustomBlockNoteEditor,
  { threadId, selection }: AddThreadToDocumentArgs
): { from: number; to: number } | null {
  const anchor = selection?.prosemirror?.anchor;
  const head = selection?.prosemirror?.head;
  if (typeof anchor !== 'number' || typeof head !== 'number' || anchor === head) {
    return null;
  }

  const from = Math.max(0, Math.min(anchor, head));
  const to = Math.min(editor.prosemirrorView.state.doc.content.size, Math.max(anchor, head));
  if (from >= to) {
    return null;
  }

  const markType = editor.prosemirrorView.state.schema.marks[CommentMark.name];
  if (!markType) {
    return null;
  }

  const selectedNode = editor.prosemirrorView.state.doc.nodeAt(from);
  if (selectedNode?.type.name === 'math' && to <= from + selectedNode.nodeSize) {
    return null;
  }

  editor.transact((tr) => {
    tr.setMeta(WISEPEN_COMMENT_MARK_SYNC_META, true);
    tr.addMark(from, to, markType.create({ threadId, orphan: false }));
  });

  return { from, to };
}

export type BuildCommentsExtensionOptions = {
  activeCommentUserId: string;
  getActiveCommentUserId: () => string;
  /** 用户是否具备批注权限（不受连接状态影响，用于 threadStoreAuth） */
  commentsAuthorizable: boolean;
  isNoteOwner: boolean;
  commentDocumentRole: BlockNoteCommentDocumentRole;
  threadsYMap: Y.Map<unknown>;
  resolveUsers: (
    userIds: string[]
  ) => Promise<Array<{ id: string; username: string; avatarUrl: string }>>;
  getEditor: () => CustomBlockNoteEditor | null;
  doc?: Doc;
  getPendingCommentSelection?: () => PendingCommentSelection | null | undefined;
  clearPendingCommentSelection?: () => void;
  onThreadDocumentMarked?: (threadId: string) => void;
  canAddThreadToDocument?: (editor: CustomBlockNoteEditor) => boolean;
};

function resolveThreadDocumentSelection(
  args: AddThreadToDocumentArgs,
  getPendingCommentSelection?: () => PendingCommentSelection | null | undefined
): AddThreadToDocumentArgs['selection'] {
  const anchor = args.selection?.prosemirror?.anchor;
  const head = args.selection?.prosemirror?.head;
  if (typeof anchor === 'number' && typeof head === 'number' && anchor !== head) {
    return args.selection;
  }

  const pending = getPendingCommentSelection?.();
  if (!pending) {
    return args.selection;
  }

  return {
    ...args.selection,
    prosemirror: pending,
  };
}

type DeleteCommentArgs = {
  threadId: string;
  commentId: string;
  softDelete?: boolean;
};

type YMapLike = {
  get: (key: string | number) => unknown;
};

type YArrayLike = {
  get: (index: number) => unknown;
};

function isGettable(value: unknown): value is YMapLike {
  return typeof value === 'object' && value !== null && 'get' in value;
}

function getFirstCommentId(rawThread: unknown): string | undefined {
  if (isGettable(rawThread)) {
    const rawComments = rawThread.get('comments');
    if (!isGettable(rawComments)) {
      return undefined;
    }
    const firstComment = (rawComments as YArrayLike).get(0);
    const firstCommentId = isGettable(firstComment) ? firstComment.get('id') : undefined;
    return typeof firstCommentId === 'string' ? firstCommentId : undefined;
  }

  const plainThread = rawThread as { comments?: Array<{ id?: unknown }> } | undefined;
  const firstCommentId = plainThread?.comments?.[0]?.id;
  return typeof firstCommentId === 'string' ? firstCommentId : undefined;
}

function isDeletingInitialComment(threadsYMap: Y.Map<unknown>, args: DeleteCommentArgs): boolean {
  const firstCommentId = getFirstCommentId(threadsYMap.get(args.threadId));
  return Boolean(firstCommentId) && firstCommentId === args.commentId;
}

function deleteThreadSidecarData(doc: Doc | undefined, threadId: string): void {
  if (!doc) {
    return;
  }
  doc.transact(() => {
    getBlockNoteThreadReferencesYMap(doc).delete(threadId);
    getBlockNoteFormulaThreadAnchorsYMap(doc).delete(threadId);
    getBlockNoteThreadDocumentSelectionsYMap(doc).delete(threadId);
  });
}

export function buildCommentsExtension(
  options: BuildCommentsExtensionOptions
): ExtensionFactoryInstance {
  const {
    activeCommentUserId,
    getActiveCommentUserId,
    commentsAuthorizable,
    isNoteOwner,
    commentDocumentRole,
    threadsYMap,
    resolveUsers,
    getEditor,
    doc,
    getPendingCommentSelection,
    clearPendingCommentSelection,
    onThreadDocumentMarked,
    canAddThreadToDocument,
  } = options;

  const threadStoreAuth = commentsAuthorizable
    ? new WisePenThreadStoreAuth(activeCommentUserId, commentDocumentRole, isNoteOwner)
    : new ReadOnlyThreadStoreAuth();

  const threadStore = new YjsThreadStore(activeCommentUserId, threadsYMap, threadStoreAuth);

  if (commentsAuthorizable) {
    bindDynamicCommentUserId(
      threadStore,
      threadStoreAuth as WisePenThreadStoreAuth,
      getActiveCommentUserId
    );
  }

  const threadStoreWithDocumentMarks = threadStore as unknown as {
    addThreadToDocument: (args: AddThreadToDocumentArgs) => Promise<void>;
    deleteComment: (args: DeleteCommentArgs) => Promise<void>;
  };
  const originalDeleteComment = threadStoreWithDocumentMarks.deleteComment.bind(threadStore);

  threadStoreWithDocumentMarks.deleteComment = async (args: DeleteCommentArgs) => {
    const shouldDeleteThread = isDeletingInitialComment(threadsYMap, args);
    await originalDeleteComment(args);
    if (!shouldDeleteThread) {
      return;
    }
    threadsYMap.delete(args.threadId);
    deleteThreadSidecarData(doc, args.threadId);
  };

  threadStoreWithDocumentMarks.addThreadToDocument = async (args: AddThreadToDocumentArgs) => {
    const editor = getEditor();
    if (!editor) {
      return;
    }
    const resolvedSelection = resolveThreadDocumentSelection(args, getPendingCommentSelection);
    const resolvedPm = resolvedSelection?.prosemirror;
    const hasValidRange =
      typeof resolvedPm?.anchor === 'number' &&
      typeof resolvedPm?.head === 'number' &&
      resolvedPm.anchor !== resolvedPm.head;
    if (!hasValidRange && canAddThreadToDocument && !canAddThreadToDocument(editor)) {
      onThreadDocumentMarked?.(args.threadId);
      return;
    }
    const appliedRange = addCommentMarkToDocumentSelection(editor, {
      threadId: args.threadId,
      selection: resolvedSelection,
    });
    if (appliedRange && doc) {
      persistThreadDocumentSelection(
        editor,
        doc,
        args.threadId,
        appliedRange.from,
        appliedRange.to
      );
    }
    onThreadDocumentMarked?.(args.threadId);
    clearPendingCommentSelection?.();
  };

  return CommentsExtension({
    threadStore,
    resolveUsers,
  });
}

export { CommentsExtension };
