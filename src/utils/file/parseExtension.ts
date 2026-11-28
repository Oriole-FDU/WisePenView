import { createError, FRONTEND_CLIENT_ERROR } from '@/utils/error';

export const parseExtension = (fileName: string): string => {
  const i = fileName.lastIndexOf('.');
  if (i <= 0 || i === fileName.length - 1) {
    throw createError({ code: FRONTEND_CLIENT_ERROR.FILE_EXTENSION_REQUIRED, source: 'client' });
  }
  return fileName.slice(i + 1).toLowerCase();
};
