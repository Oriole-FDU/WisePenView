import type { User } from '@/domains/User';

import type { NoteCollaborationUser } from '../runtime/runtime.type';

const NOTE_COLLABORATION_PRIMARY_COLORS = [
  '#127abb',
  '#be435a',
  '#248286',
  '#b85d43',
  '#2f8a64',
  '#835ec7',
] as const;

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
