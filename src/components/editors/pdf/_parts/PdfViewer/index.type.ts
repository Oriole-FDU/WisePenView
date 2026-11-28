export interface PdfViewerProps {
  resourceId: string;
  /** Service 已解析的预览地址；缺省时仍使用标准文档预览接口。 */
  sourceUrl?: string;
  config?: Record<string, unknown>;
  className?: string;
  onLoadError?: (error: unknown) => void;
}
