import { createClientError, FRONTEND_CLIENT_ERROR } from '@/utils/error';

/** 与后端 `wisepen.storage.max-small-file-size` 默认一致 */
export const IMAGE_UPLOAD_MAX_BYTES = 5 * 1024 * 1024;

export const IMAGE_UPLOAD_MAX_SIZE_LABEL = '5MB';

/**
 * 与后端图床代理 `max-small-file-size` 一致；超过则抛错，供 `uploadImage` 与业务层复用。
 */
export function assertImageProxyUploadLimit(file: File): void {
  if (file.size > IMAGE_UPLOAD_MAX_BYTES) {
    throw createClientError(FRONTEND_CLIENT_ERROR.IMAGE_FILE_TOO_LARGE, {
      maxSize: IMAGE_UPLOAD_MAX_SIZE_LABEL,
    });
  }
}
