import React, { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';

import styles from './style.module.less';

/** 与 `public/pdfjs-5` 中 viewer 路径一致 */
const PDF_VIEWER_PATH = '/pdfjs-5/web/viewer.html';

/** 未传 `file` 时使用 pdf.js 自带的示例 PDF（同目录） */
const DEFAULT_PDF_PATH = '/pdfjs-5/web/compressed.tracemonkey-pldi-09.pdf';

/**
 * PDF 阅读器：在中间内容区以 iframe 全高嵌入 pdf.js viewer。
 * 路由：`/app/pdf`，可选查询参数 `file` 为要打开的 PDF 地址（绝对 URL 或站内路径）。
 */
const Pdf: React.FC = () => {
  const [searchParams] = useSearchParams();

  const iframeSrc = useMemo(() => {
    const raw = searchParams.get('file')?.trim();
    const pathOrUrl = raw && raw.length > 0 ? raw : DEFAULT_PDF_PATH;
    let pdfHref: string;
    try {
      pdfHref = new URL(pathOrUrl, window.location.origin).href;
    } catch {
      pdfHref = new URL(DEFAULT_PDF_PATH, window.location.origin).href;
    }
    const qs = new URLSearchParams({ file: pdfHref });
    return `${PDF_VIEWER_PATH}?${qs.toString()}`;
  }, [searchParams]);

  return (
    <div className={styles.container}>
      <iframe className={styles.viewer} title="PDF 阅读器" src={iframeSrc} />
    </div>
  );
};

export default Pdf;
