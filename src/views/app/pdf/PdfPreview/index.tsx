import EntryIcon from '@/components/Common/EntryIcon';
import IconText from '@/components/Common/IconText';
import ResourceInteractBar from '@/components/Common/ResourceInteractBar';
import ResourceInteractFooter from '@/components/Common/ResourceInteractFooter';
import ResourceViewerHeader from '@/components/Common/ResourceViewerHeader';
import rvhStyles from '@/components/Common/ResourceViewerHeader/style.module.less';
import PdfViewer from '@/components/Pdf/PdfViewer/index';
import { useDocumentService, useResourceService } from '@/domains';
import { RESOURCE_TYPE } from '@/domains/Resource';
import { parseErrorMessage } from '@/utils/error';
import { Button, toast } from '@heroui/react';
import { useRequest } from 'ahooks';
import { Result, Spin } from 'antd';
import { useCallback, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import styles from './style.module.less';

function PdfPreview() {
  const { resourceId } = useParams<{ resourceId: string }>();
  const [viewerErrorMap, setViewerErrorMap] = useState<Record<string, unknown>>({});
  const documentService = useDocumentService();
  const resourceService = useResourceService();
  const {
    data: docInfo,
    error: docInfoError,
    loading: isDocInfoLoading,
    refresh: refreshDocInfo,
  } = useRequest(
    async () => {
      return await documentService.getDocInfo(resourceId as string);
    },
    {
      ready: Boolean(resourceId),
      refreshDeps: [resourceId],
    }
  );

  const [displayLiked, setDisplayLiked] = useState<boolean | undefined>(undefined);
  const [displayLikeCount, setDisplayLikeCount] = useState<number | null | undefined>(undefined);
  const [displayUserScore, setDisplayUserScore] = useState<number | null | undefined>(undefined);

  const resourceInfo = docInfo?.resourceInfo;

  const { run: runToggleLike, loading: likeLoading } = useRequest(
    () => resourceService.interactToggleLike({ resourceId: resourceId as string }),
    {
      manual: true,
      onBefore: () => {
        const curLiked = displayLiked ?? resourceInfo?.liked ?? false;
        const curLikeCount = displayLikeCount ?? resourceInfo?.likeCount ?? 0;
        setDisplayLiked(!curLiked);
        setDisplayLikeCount(curLikeCount + (curLiked ? -1 : 1));
      },
      onSuccess: (res) => {
        setDisplayLiked(res.liked);
      },
      onError: (err) => {
        setDisplayLiked(resourceInfo?.liked ?? false);
        setDisplayLikeCount(resourceInfo?.likeCount ?? null);
        toast.danger(parseErrorMessage(err));
      },
    }
  );

  const { run: runRate, loading: rateLoading } = useRequest(
    (score: number) => resourceService.interactRate({ resourceId: resourceId as string, score }),
    {
      manual: true,
      onSuccess: (res) => {
        setDisplayUserScore(res.userScore);
        void refreshDocInfo();
      },
      onError: (err) => {
        toast.danger(parseErrorMessage(err));
      },
    }
  );

  const handleToggleLike = useCallback(() => {
    if (!resourceId) return;
    runToggleLike();
  }, [resourceId, runToggleLike]);

  const handleRate = useCallback(
    (score: number) => {
      if (!resourceId) return;
      runRate(score);
    },
    [resourceId, runRate]
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
                    <Button variant="secondary">返回云盘</Button>
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
                subTitle={parseErrorMessage(docInfoError)}
                extra={
                  <Link to="/app/drive">
                    <Button variant="secondary">返回云盘</Button>
                  </Link>
                }
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 仅在初次加载（尚无数据）时展示全页 spinner；refresh 时保留旧 docInfo，不触发全页 loading
  if (isDocInfoLoading && !docInfo) {
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
                    <Button variant="secondary">返回云盘</Button>
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
            <IconText
              className={rvhStyles.inlineTitleText}
              icon={
                <EntryIcon
                  entryType="resource"
                  resourceType={docInfo.resourceInfo.resourceType ?? RESOURCE_TYPE.FILE}
                />
              }
              iconSize={18}
              gap="var(--ant-margin-sm)"
              ellipsis
            >
              {docInfo.resourceInfo.resourceName}
            </IconText>
          }
        />
        <div className={styles.statesBelowHeader}>
          <div className={styles.middleOverlay}>
            <div className={styles.middleOverlayInner}>
              <Result
                status="warning"
                title="文档预览失败"
                subTitle={parseErrorMessage(viewerError)}
                extra={
                  <Link to="/app/drive">
                    <Button variant="secondary">返回云盘</Button>
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
          <IconText
            className={rvhStyles.inlineTitleText}
            icon={
              <EntryIcon
                entryType="resource"
                resourceType={docInfo.resourceInfo.resourceType ?? RESOURCE_TYPE.FILE}
              />
            }
            iconSize={18}
            gap="var(--ant-margin-sm)"
            ellipsis
          >
            {docInfo.resourceInfo.resourceName}
          </IconText>
        }
      />
      <div className={styles.content}>
        <div className={styles.root}>
          <ResourceInteractBar
            readCount={resourceInfo?.readCount}
            likeCount={displayLikeCount ?? resourceInfo?.likeCount}
            scoreAvg={resourceInfo?.scoreAvg}
          />
          <PdfViewer key={resourceId} resourceId={resourceId} onLoadError={handleViewerLoadError} />
          <ResourceInteractFooter
            liked={displayLiked ?? resourceInfo?.liked ?? false}
            userScore={displayUserScore !== undefined ? displayUserScore : resourceInfo?.userScore}
            onToggleLike={handleToggleLike}
            onRate={handleRate}
            likeLoading={likeLoading}
            rateLoading={rateLoading}
          />
        </div>
      </div>
    </div>
  );
}

export default PdfPreview;
