import React, { useCallback, useState } from 'react';
import { Button, Result, Spin } from 'antd';
import { Link, useParams } from 'react-router-dom';
import { useRequest } from 'ahooks';
import { RiFileTextLine } from 'react-icons/ri';
import ResourceViewerHeader from '@/components/Common/ResourceViewerHeader';
import rvhStyles from '@/components/Common/ResourceViewerHeader/style.module.less';
import PdfViewer from '@/components/Pdf/PdfViewer/index';
import { useDocumentService } from '@/contexts/ServicesContext';
import { parseErrorMessage } from '@/utils/parseErrorMessage';
import styles from './style.module.less';

const PdfPreview: React.FC = () => {
  const { resourceId } = useParams<{ resourceId: string }>();
  const [viewerErrorMap, setViewerErrorMap] = useState<Record<string, unknown>>({});
  const documentService = useDocumentService();
  const {
    data: docInfo,
    error: docInfoError,
    loading: isDocInfoLoading,
  } = useRequest(
    async () => {
      return await documentService.getDocInfo(resourceId as string);
    },
    {
      ready: Boolean(resourceId),
      refreshDeps: [resourceId],
    }
  );
  const currentResourceId = resourceId ?? '';
  const viewerError = viewerErrorMap[currentResourceId];
  const handleViewerLoadError = useCallback(
    (error: unknown) => {
      if (!currentResourceId) {
        return;
      }
      setViewerErrorMap((prev) => ({
        ...prev,
        [currentResourceId]: error,
      }));
    },
    [currentResourceId]
  );

  if (!resourceId) {
    return (
      <div className={styles.container}>
        <ResourceViewerHeader />
        <div className={styles.statesBelowHeader}>
          <div className={styles.middleOverlay}>
            <div className={styles.middleOverlayInner}>
              <Result
                status="warning"
                title="无法打开文档"
                extra={
                  <Link to="/app/drive">
                    <Button type="default">返回云盘</Button>
                  </Link>
                }
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (docInfoError) {
    return (
      <div className={styles.container}>
        <ResourceViewerHeader />
        <div className={styles.statesBelowHeader}>
          <div className={styles.middleOverlay}>
            <div className={styles.middleOverlayInner}>
              <Result
                status="warning"
                title="无法打开文档"
                subTitle={parseErrorMessage(docInfoError, '文档不存在或无访问权限')}
                extra={
                  <Link to="/app/drive">
                    <Button type="default">返回云盘</Button>
                  </Link>
                }
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isDocInfoLoading) {
    return (
      <div className={styles.container}>
        <ResourceViewerHeader />
        <div className={styles.statesBelowHeader}>
          <div className={styles.middleOverlay} aria-busy="true" aria-live="polite">
            <div className={styles.middleOverlayLoading}>
              <Spin size="large" />
              <span className={styles.middleOverlayText}>正在加载文档信息...</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!docInfo) {
    return (
      <div className={styles.container}>
        <ResourceViewerHeader />
        <div className={styles.statesBelowHeader}>
          <div className={styles.middleOverlay}>
            <div className={styles.middleOverlayInner}>
              <Result
                status="warning"
                title="无法打开文档"
                subTitle="文档信息为空，请稍后重试"
                extra={
                  <Link to="/app/drive">
                    <Button type="default">返回云盘</Button>
                  </Link>
                }
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (viewerError) {
    return (
      <div className={styles.container}>
        <ResourceViewerHeader
          inlineTitle={
            <>
              <RiFileTextLine aria-hidden />
              <span className={rvhStyles.inlineTitleText}>{docInfo.resourceInfo.resourceName}</span>
            </>
          }
        />
        <div className={styles.statesBelowHeader}>
          <div className={styles.middleOverlay}>
            <div className={styles.middleOverlayInner}>
              <Result
                status="warning"
                title="文档预览失败"
                subTitle={parseErrorMessage(viewerError, '文档预览地址无效或已失效')}
                extra={
                  <Link to="/app/drive">
                    <Button type="default">返回云盘</Button>
                  </Link>
                }
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <ResourceViewerHeader
        inlineTitle={
          <>
            <RiFileTextLine aria-hidden />
            <span className={rvhStyles.inlineTitleText}>{docInfo.resourceInfo.resourceName}</span>
          </>
        }
      />
      <div className={styles.content}>
        <div className={styles.root}>
          <PdfViewer key={resourceId} resourceId={resourceId} onLoadError={handleViewerLoadError} />
        </div>
      </div>
    </div>
  );
};

export default PdfPreview;
