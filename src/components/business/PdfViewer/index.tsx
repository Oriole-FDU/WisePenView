import { buildApiUrl } from '@/apis/apiServerAddr';
import { cn } from '@/utils/cn';
import { createClientError, FRONTEND_CLIENT_ERROR, isWisePenError } from '@/utils/error';
import {
  PDFViewer as EmbedPdfViewer,
  type DocumentManagerPlugin,
  type I18nPlugin,
  type PDFViewerRef,
} from '@embedpdf/react-pdf-viewer';
import { useMount, useUnmount } from 'ahooks';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { PdfViewerProps } from './index.type';
import { DEFAULT_PDF_VIEWER_CONFIG } from './pdf.config';
import styles from './style.module.less';

function readConfigSection(value: unknown): Record<string, unknown> {
  return value != null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function createViewerConfig(
  config: Record<string, unknown> | undefined,
  locale: string
): Record<string, unknown> {
  const baseConfig = config ?? DEFAULT_PDF_VIEWER_CONFIG;
  const i18nConfig = readConfigSection(baseConfig.i18n);

  return {
    ...baseConfig,
    i18n: {
      ...i18nConfig,
      defaultLocale: locale,
      fallbackLocale: i18nConfig.fallbackLocale ?? 'en',
    },
  };
}

function PdfViewer({ resourceId, sourceUrl, config, className, onLoadError }: PdfViewerProps) {
  const { i18n } = useTranslation();
  const pdfLocale = i18n.resolvedLanguage === 'en-US' ? 'en' : 'zh-CN';
  const viewerRef = useRef<PDFViewerRef | null>(null);
  const onDocumentErrorCleanupRef = useRef<(() => void) | null>(null);
  // EmbedPDF 只在实例初始化时读取 config；用惰性状态保存该次初始化快照。
  const [viewerConfig] = useState(() => createViewerConfig(config, pdfLocale));

  const loadDocument = async () => {
    if (!resourceId || !viewerRef.current) return;

    try {
      const registry = await viewerRef.current.registry;
      if (!registry) return;
      const docManager = registry.getPlugin<DocumentManagerPlugin>('document-manager')?.provides();
      if (!docManager) {
        const err = createClientError(FRONTEND_CLIENT_ERROR.PDF_MANAGER_UNAVAILABLE);
        onLoadError?.(err);
        return;
      }
      if (onDocumentErrorCleanupRef.current === null) {
        const cleanup = docManager.onDocumentError(({ reason, message }) => {
          const error = reason ?? message;
          console.error('[PdfViewer] 文档事件错误:', error);
          onLoadError?.(
            isWisePenError(error)
              ? error
              : createClientError(FRONTEND_CLIENT_ERROR.DOCUMENT_LOAD_FAILED, undefined, error)
          );
        });
        if (typeof cleanup === 'function') {
          onDocumentErrorCleanupRef.current = cleanup;
        }
      }
      const documentId = `doc-${resourceId}`;
      const resolvedSourceUrl =
        sourceUrl ??
        buildApiUrl(`/document/getDocPreview?resourceId=${encodeURIComponent(resourceId)}`);
      await docManager
        .openDocumentUrl({
          url: resolvedSourceUrl,
          documentId,
          mode: sourceUrl ? 'full-fetch' : 'range-request',
          requestOptions: sourceUrl ? undefined : { credentials: 'include' },
          permissions: {
            overrides: {
              print: false,
              copyContents: false,
            },
          },
        })
        .toPromise();
    } catch (error) {
      console.error('[PdfViewer] 文档加载失败:', error);
      onLoadError?.(
        isWisePenError(error)
          ? error
          : createClientError(FRONTEND_CLIENT_ERROR.DOCUMENT_LOAD_FAILED, undefined, error)
      );
    }
  };

  useMount(() => {
    void loadDocument();
  });

  /**
   * @wisepen-manual-effect
   * 执行时机：应用语言变化后同步 PDF Viewer 的本地化配置。
   * 不可替代原因：第三方 Viewer 仅提供命令式语言 API，不能由 JSX 属性更新。
   * cleanup：没有订阅或延迟任务，无需清理。
   */
  useEffect(() => {
    const syncViewerLocale = async () => {
      if (!viewerRef.current) return;
      const registryPromise = viewerRef.current.registry;
      if (!registryPromise) return;
      const registry = await registryPromise;
      registry.getPlugin<I18nPlugin>('i18n')?.provides()?.setLocale(pdfLocale);
    };
    void syncViewerLocale();
  }, [pdfLocale]);

  useUnmount(() => {
    if (onDocumentErrorCleanupRef.current) {
      onDocumentErrorCleanupRef.current();
      onDocumentErrorCleanupRef.current = null;
    }
  });

  return (
    <EmbedPdfViewer
      ref={viewerRef}
      config={viewerConfig}
      className={cn(styles.viewer, className)}
    />
  );
}

export default PdfViewer;
