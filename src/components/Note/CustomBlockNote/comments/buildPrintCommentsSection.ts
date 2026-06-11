import type { ThreadData } from '@blocknote/core/comments';
import { CommentMark } from '@blocknote/core/comments';
import type { Doc } from 'yjs';

import type { CustomBlockNoteEditor } from '../blockNoteSchema';
import {
  getBlockNoteThreadReferencesYMap,
  getBlockNoteThreadsYMap,
} from './commentThreadConstants';
import { normalizeAvatarUrl, type CommentUserProfile } from './commentUserProfile';
import type { CommentUserDisplayRecord } from './comments.types';
import {
  filterThreadsByResolvedState,
  getThreadComments,
  getThreadReferenceText,
  sortCommentThreads,
  type ThreadPosition,
} from './threadReferenceText';
import { filterThreadsByVisibility, type ThreadVisibilityContext } from './threadVisibility';

type YjsJsonLike = {
  toJSON: () => unknown;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isYjsJsonLike(value: unknown): value is YjsJsonLike {
  return isRecord(value) && typeof value.toJSON === 'function';
}

function toPlainYjsValue(value: unknown): unknown {
  if (isYjsJsonLike(value)) {
    return toPlainYjsValue(value.toJSON());
  }
  if (Array.isArray(value)) {
    return value.map(toPlainYjsValue);
  }
  if (isRecord(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([key, child]) => [key, toPlainYjsValue(child)])
    );
  }
  return value;
}

function extractPlainTextFromCommentBody(body: unknown): string {
  if (typeof body === 'string') {
    return body.trim();
  }
  if (Array.isArray(body)) {
    const parts = body.map(extractPlainTextFromCommentBody).filter(Boolean);
    return parts.join('').trim();
  }
  if (!isRecord(body)) {
    return '';
  }

  const text = typeof body.text === 'string' ? body.text : '';
  const content = extractPlainTextFromCommentBody(body.content);
  const children = extractPlainTextFromCommentBody(body.children);
  return `${text}${content}${children}`.trim();
}

function readThreadsFromDoc(doc: Doc): ThreadData[] {
  const threadsYMap = getBlockNoteThreadsYMap(doc);
  const threads: ThreadData[] = [];

  threadsYMap.forEach((rawThread, threadId) => {
    const plainThread = toPlainYjsValue(rawThread);
    if (!isRecord(plainThread)) {
      return;
    }
    const thread = plainThread as ThreadData;
    threads.push({
      ...thread,
      id: thread.id || String(threadId),
    });
  });

  return threads;
}

export type BuildPrintCommentsSectionOptions = {
  editor: CustomBlockNoteEditor;
  doc: Doc;
  visibilityContext: ThreadVisibilityContext;
  localThreadReferenceTexts: ReadonlyMap<string, string>;
  commentUsersById?: CommentUserDisplayRecord;
  commentUsersYMap: {
    get: (key: string) => CommentUserProfile | undefined;
  };
  formulaThreadPositions: Map<string, ThreadPosition>;
};

export function buildPrintCommentsSection(
  options: BuildPrintCommentsSectionOptions
): HTMLElement | null {
  const {
    editor,
    doc,
    visibilityContext,
    localThreadReferenceTexts,
    commentUsersById,
    commentUsersYMap,
    formulaThreadPositions,
  } = options;
  const threadReferencesYMap = getBlockNoteThreadReferencesYMap(doc);
  const threads = readThreadsFromDoc(doc);
  const visible = filterThreadsByVisibility(threads, visibilityContext);
  const printable = filterThreadsByResolvedState(visible, 'all');
  const threadPositions = getPrintThreadPositions(editor, formulaThreadPositions);
  const sorted = sortCommentThreads(printable, 'position', threadPositions);

  if (sorted.length === 0) {
    return null;
  }

  const section = document.createElement('section');
  section.className = 'note-print-comments note-print-comments-sidebar';

  const heading = document.createElement('h2');
  heading.className = 'note-print-comments-title';
  heading.textContent = '批注';
  section.appendChild(heading);

  for (const thread of sorted) {
    const storedReference =
      localThreadReferenceTexts.get(thread.id) ?? threadReferencesYMap.get(thread.id);
    const referenceText = getThreadReferenceText(
      editor,
      thread,
      storedReference,
      threadPositions.get(thread.id)
    );

    const threadEl = document.createElement('article');
    threadEl.className = 'note-print-comment-thread';

    const refEl = document.createElement('p');
    refEl.className = 'note-print-comment-reference';
    refEl.textContent = referenceText || '（无引用文本）';
    threadEl.appendChild(refEl);

    if (thread.resolved) {
      const statusEl = document.createElement('p');
      statusEl.className = 'note-print-comment-status';
      statusEl.textContent = '（已解决）';
      threadEl.appendChild(statusEl);
    }

    const list = document.createElement('ul');
    list.className = 'note-print-comment-list';

    for (const comment of getThreadComments(thread)) {
      const text = extractPlainTextFromCommentBody(comment.body);
      if (!text) {
        continue;
      }
      const item = document.createElement('li');
      item.className = 'note-print-comment-item';

      const author = resolvePrintCommentUser(comment.userId, commentUsersById, commentUsersYMap);
      const authorEl = document.createElement('span');
      authorEl.className = 'note-print-comment-author';
      if (author.avatarUrl) {
        const avatarEl = document.createElement('img');
        avatarEl.className = 'note-print-comment-avatar';
        avatarEl.alt = '';
        avatarEl.src = author.avatarUrl;
        authorEl.appendChild(avatarEl);
      } else {
        const avatarFallbackEl = document.createElement('span');
        avatarFallbackEl.className = 'note-print-comment-avatar note-print-comment-avatar-fallback';
        avatarFallbackEl.textContent = author.username.slice(0, 1).toUpperCase();
        authorEl.appendChild(avatarFallbackEl);
      }

      const nameEl = document.createElement('span');
      nameEl.className = 'note-print-comment-username';
      nameEl.textContent = author.username;
      authorEl.appendChild(nameEl);

      const textEl = document.createElement('span');
      textEl.className = 'note-print-comment-text';
      textEl.textContent = text;

      item.appendChild(authorEl);
      item.appendChild(textEl);
      list.appendChild(item);
    }

    if (list.childNodes.length > 0) {
      threadEl.appendChild(list);
      section.appendChild(threadEl);
    }
  }

  return section.childNodes.length > 1 ? section : null;
}

function getPrintThreadPositions(
  editor: CustomBlockNoteEditor,
  formulaThreadPositions: Map<string, ThreadPosition>
): Map<string, ThreadPosition> {
  const positions = new Map(formulaThreadPositions);
  const markType = editor.prosemirrorView.state.schema.marks[CommentMark.name];
  if (!markType) {
    return positions;
  }

  editor.prosemirrorView.state.doc.descendants((node, pos) => {
    node.marks.forEach((mark) => {
      if (mark.type !== markType || typeof mark.attrs.threadId !== 'string') {
        return;
      }
      const threadId = mark.attrs.threadId;
      if (positions.has(threadId)) {
        return;
      }
      positions.set(threadId, {
        from: pos,
        to: pos + node.nodeSize,
      });
    });
  });

  return positions;
}

function resolvePrintCommentUser(
  userId: string | undefined,
  commentUsersById: CommentUserDisplayRecord | undefined,
  commentUsersYMap: { get: (key: string) => CommentUserProfile | undefined }
) {
  const id = userId?.trim() || '';
  const syncedUser = id ? commentUsersYMap.get(id) : undefined;
  if (syncedUser) {
    return {
      username: syncedUser.username || id || '未知用户',
      avatarUrl: syncedUser.avatarUrl || '',
    };
  }

  const knownUser = id ? commentUsersById?.[id] : undefined;
  if (knownUser) {
    return {
      username: knownUser.name || id || '未知用户',
      avatarUrl: normalizeAvatarUrl(knownUser.avatar),
    };
  }

  return {
    username: id || '未知用户',
    avatarUrl: '',
  };
}
