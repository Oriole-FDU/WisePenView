import React, { useMemo, useRef } from 'react';
import { useLocation, useParams } from 'react-router-dom';

import { useDocumentService } from '@/contexts/ServicesContext';
import { type PdfPreviewProgress, usePdfPreviewProgressStore } from '@/store';

import styles from './style.module.less';
import { useParamsEffect } from '@/hooks/useParamsEffect';

/**
 * PDF 阅读器：iframe 嵌入 pdf.js（`public/pdfjs-5/web/viewer.html`）。
 * 路由：`/app/pdf/:resourceId`，resourceId 即 documentId / resourceId。
 */
const Pdf: React.FC = () => {
  const documentService = useDocumentService();
  const location = useLocation();
  const { resourceId } = useParams();
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const setProgress = usePdfPreviewProgressStore((s) => s.setProgress);

  // 记录当前的阅读进度
  const routeProgress = useMemo<PdfPreviewProgress | null>(() => {
    const qs = new URLSearchParams(location.search);
    const pageRaw = qs.get('page');
    const zoomRaw = qs.get('zoom');
    const page = pageRaw == null ? Number.NaN : Number(pageRaw);
    const zoom = zoomRaw?.trim();
    if (!Number.isInteger(page) || page <= 0 || !zoom) {
      return null;
    }
    return { page, zoom };
  }, [location.search]);

  // 生成 iframe 的 src
  const iframeSrc = useMemo(() => {
    const id = resourceId?.trim();
    if (!id) {
      return '';
    }
    const pdfHref = documentService.getDocumentPreviewUrl(id);
    const fallbackProgress = usePdfPreviewProgressStore.getState().progressByResourceId[id];
    const initialProgress = routeProgress ?? fallbackProgress;

    const qs = new URLSearchParams({ file: pdfHref });
    const hashQs = new URLSearchParams();
    if (initialProgress != null) {
      hashQs.set('page', String(initialProgress.page));
      hashQs.set('zoom', initialProgress.zoom);
    }
    return hashQs.size > 0
      ? `/pdfjs-5/web/viewer.html?${qs.toString()}#${hashQs.toString()}`
      : `/pdfjs-5/web/viewer.html?${qs.toString()}`;
  }, [documentService, resourceId, routeProgress]);

  // 在 resourceId 变化时，更新 iframe 的 src
  useParamsEffect([resourceId], (nextResourceId) => {
    const id = nextResourceId?.trim();
    const iframe = iframeRef.current;
    if (!id || iframe == null) {
      return;
    }

    const saveProgress = (hash: string) => {
      const hashQs = new URLSearchParams(hash.startsWith('#') ? hash.slice(1) : hash);
      const pageRaw = hashQs.get('page');
      const zoomRaw = hashQs.get('zoom');
      const page = pageRaw == null ? Number.NaN : Number(pageRaw);
      const zoom = zoomRaw?.trim();
      if (!Number.isInteger(page) || page <= 0 || !zoom) {
        return;
      }
      setProgress(id, { page, zoom });
    };

    const bindViewerEvents = () => {
      const win = iframe.contentWindow;
      if (win == null) {
        return;
      }
      saveProgress(win.location.hash);
      const handleHashChange = () => saveProgress(win.location.hash);
      win.addEventListener('hashchange', handleHashChange);
      return () => win.removeEventListener('hashchange', handleHashChange);
    };

    let unbind = bindViewerEvents();
    const handleLoad = () => {
      unbind?.();
      unbind = bindViewerEvents();
    };
    iframe.addEventListener('load', handleLoad);

    return () => {
      iframe.removeEventListener('load', handleLoad);
      unbind?.();
    };
  });

  return (
    <div className={styles.container}>
      {iframeSrc ? (
        <iframe ref={iframeRef} className={styles.viewer} title="PDF 阅读器" src={iframeSrc} />
      ) : null}
    </div>
  );
};

export default Pdf;
