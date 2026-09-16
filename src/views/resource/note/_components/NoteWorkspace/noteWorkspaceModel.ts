import type { NoteCollaborationUser } from '@/components/business/Note/CustomBlockNote/index.type';
import type { NoteSaveStatus } from '@/domains/Note';
import type { User } from '@/domains/User';

import type { NoteTitleSaveStatus } from '../NoteTitle';

const NOTE_COLLABORATION_PRIMARY_COLORS = [
  '#127abb',
  '#be435a',
  '#248286',
  '#b85d43',
  '#2f8a64',
  '#835ec7',
] as const;

export type NoteHeaderSaveStatus = NoteSaveStatus | 'failed';

export function getNoteCollaborationUserName(user: User | undefined, fallbackName: string): string {
  return user?.nickname?.trim() || user?.realName?.trim() || user?.username?.trim() || fallbackName;
}

export function pickNoteCollaborationColor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return NOTE_COLLABORATION_PRIMARY_COLORS[hash % NOTE_COLLABORATION_PRIMARY_COLORS.length];
}

export function buildNoteCollaborationUser(
  user: User | undefined,
  fallbackName: string
): NoteCollaborationUser {
  const name = getNoteCollaborationUserName(user, fallbackName);
  const colorSeed = user?.id?.trim() || user?.username?.trim() || name;
  return {
    name,
    color: pickNoteCollaborationColor(colorSeed),
  };
}

export function sanitizeDownloadFileName(fileName: string, fallbackName: string): string {
  const normalizedName = fileName.trim().replace(/[\\/:*?"<>|]+/g, '_');
  const safeName = normalizedName.replace(/[.\s]+$/g, '');
  return safeName || fallbackName;
}

export function downloadTextArtifact(params: {
  content: string;
  mimeType: string;
  fileName: string;
}): void {
  const blob = new Blob([params.content], { type: params.mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = params.fileName;
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  try {
    anchor.click();
  } finally {
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  }
}

export function resolveNoteHeaderSaveStatus(
  bodyStatus: NoteSaveStatus,
  titleStatus: NoteTitleSaveStatus
): NoteHeaderSaveStatus {
  if (titleStatus === 'failed') return 'failed';
  if (bodyStatus === 'waiting') return 'waiting';
  if (bodyStatus === 'saving' || titleStatus === 'saving') return 'saving';
  return 'saved';
}
