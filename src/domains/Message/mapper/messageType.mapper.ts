import type { MessageType } from '../entity/message';

export const normalizeMessageType = (type?: string): MessageType | undefined => {
  const normalized = type?.trim().toUpperCase();
  if (
    normalized === 'SYSTEM' ||
    normalized === 'NORMAL' ||
    normalized === 'GROUP' ||
    normalized === 'RESOURCE_INTERACTION'
  ) {
    return normalized;
  }
  return undefined;
};
