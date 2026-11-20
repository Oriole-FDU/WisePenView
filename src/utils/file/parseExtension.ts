import { createDomainError, FRONTEND_DOMAIN_ERROR } from '@/utils/error';

export const parseExtension = (fileName: string): string => {
  const i = fileName.lastIndexOf('.');
  if (i <= 0 || i === fileName.length - 1) {
    throw createDomainError(FRONTEND_DOMAIN_ERROR.FILE_EXTENSION_REQUIRED);
  }
  return fileName.slice(i + 1).toLowerCase();
};
