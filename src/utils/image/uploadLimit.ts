import { createClientError, FRONTEND_CLIENT_ERROR, parseErrorMessage } from '@/utils/error';
import { Upload } from 'antd';

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

/**
 * 用于 Ant Design Upload `beforeUpload`：超过图床代理上限时不进入 fileList，并提示。
 * 返回 `false` 表示不自动上传（由业务在提交时再调 ImageService）。
 * `onOversize` 请传入 `toast.danger` 等统一 toast 方法。
 */
export const createBeforeUploadImageWithinLimit = (
  onOversize: (text: string) => void
): ((file: File) => boolean | typeof Upload.LIST_IGNORE) => {
  return (file: File) => {
    if (file.size > IMAGE_UPLOAD_MAX_BYTES) {
      onOversize(
        parseErrorMessage(
          createClientError(FRONTEND_CLIENT_ERROR.IMAGE_FILE_TOO_LARGE, {
            maxSize: IMAGE_UPLOAD_MAX_SIZE_LABEL,
          })
        )
      );
      return Upload.LIST_IGNORE;
    }
    return false;
  };
};
