import React, { useMemo } from 'react';
import { useParams } from 'react-router-dom';

import { useDocumentService } from '@/contexts/ServicesContext';

import styles from './style.module.less';

/**
 * PDF 阅读器：iframe 嵌入 pdf.js（`public/pdfjs-5/web/viewer.html`）。
 * 路由：`/app/pdf/:resourceId`，resourceId 即 documentId / resourceId。
 */
const Pdf: React.FC = () => {
  const documentService = useDocumentService();
  const { resourceId } = useParams();

  const iframeSrc = useMemo(() => {
    const id = resourceId?.trim();
    if (!id) {
      return '';
    }
    const pdfHref = documentService.getDocumentPreviewUrl(id);
    const qs = new URLSearchParams({ file: pdfHref });
    return `/pdfjs-5/web/viewer.html?${qs.toString()}`;
  }, [documentService, resourceId]);

  return (
    <div className={styles.container}>
      {iframeSrc ? (
        <iframe className={styles.viewer} title="PDF 阅读器" src={iframeSrc} />
      ) : null}
    </div>
  );
};

export default Pdf;
