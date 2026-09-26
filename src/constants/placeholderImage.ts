/**
 * 图片占位符 - 用于 Image 组件的 fallback 或封面缺省
 * 使用 SVG data URL，显示图片图标
 */
export const PLACEHOLDER_IMAGE =
  'data:image/svg+xml,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><rect fill="#f0f0f0" width="100" height="100"/><path fill="#bfbfbf" d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z" transform="translate(38,38) scale(1)"/></svg>'
  );
