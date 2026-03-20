import { Upload } from 'antd';
import { IMAGE_UPLOAD_MAX_BYTES, IMAGE_UPLOAD_MAX_SIZE_LABEL } from '@/services/Image';

/**
 * 图片占位符 - 用于 Image 组件的 fallback 或封面缺省
 * 使用 SVG data URL，显示图片图标
 */
export const PLACEHOLDER_IMAGE =
  'data:image/svg+xml,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><rect fill="#f0f0f0" width="100" height="100"/><path fill="#bfbfbf" d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z" transform="translate(38,38) scale(1)"/></svg>'
  );

/**
 * 用于 Ant Design Upload `beforeUpload`：超过图床代理上限时不进入 fileList，并提示。
 * 返回 `false` 表示不自动上传（由业务在提交时再调 ImageService）。
 * `onOversize` 请传入 `useAppMessage().error` 等，避免使用静态 message。
 */
export const createBeforeUploadImageWithinLimit = (
  onOversize: (text: string) => void
): ((file: File) => boolean | typeof Upload.LIST_IGNORE) => {
  return (file: File) => {
    if (file.size > IMAGE_UPLOAD_MAX_BYTES) {
      onOversize(`图片大小不能超过 ${IMAGE_UPLOAD_MAX_SIZE_LABEL}`);
      return Upload.LIST_IGNORE;
    }
    return false;
  };
};
