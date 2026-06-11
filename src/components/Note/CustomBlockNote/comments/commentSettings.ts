import type { Doc } from 'yjs';

/** 文档级批注可见性策略（owner 在「更多」中配置，协同同步） */
export const BLOCKNOTE_YJS_COMMENT_SETTINGS_MAP = 'comment-settings' as const;

export type CollaboratorCommentVisibility = 'all' | 'own_only';

export type CommentSettings = {
  collaboratorVisibility: CollaboratorCommentVisibility;
};

export const DEFAULT_COMMENT_SETTINGS: CommentSettings = {
  collaboratorVisibility: 'all',
};

export function getBlockNoteCommentSettingsYMap(doc: Doc) {
  return doc.getMap<CommentSettings>(BLOCKNOTE_YJS_COMMENT_SETTINGS_MAP);
}

export function readCommentSettings(raw: unknown): CommentSettings {
  if (typeof raw !== 'object' || raw === null) {
    return DEFAULT_COMMENT_SETTINGS;
  }
  const visibility = (raw as CommentSettings).collaboratorVisibility;
  if (visibility === 'own_only') {
    return { collaboratorVisibility: 'own_only' };
  }
  return DEFAULT_COMMENT_SETTINGS;
}

export function getCommentSettingsFromDoc(doc: Doc): CommentSettings {
  const map = getBlockNoteCommentSettingsYMap(doc);
  const stored = map.get('settings');
  return readCommentSettings(stored);
}

export function setCommentSettingsOnDoc(doc: Doc, settings: CommentSettings): void {
  const map = getBlockNoteCommentSettingsYMap(doc);
  map.set('settings', settings);
}
