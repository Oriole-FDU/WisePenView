import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

import { getApiBaseUrl } from '@/apis/runtime';
import { AppButton } from '@/components/base/Button';
import { ResultState, Spin } from '@/components/base/Feedback';
import EditorPresentationBinding from '@/components/editors/_runtime/EditorPresentationBinding';
import { isHtmlPageReady, useHtmlPageService, useResourceInteractionService } from '@/domains';
import { RESOURCE_KIND } from '@/domains/Resource/model/resourceTarget';
import { useApi } from '@/hooks/useApi';
import { parseErrorMessage } from '@/utils/error';
import { APP_ROUTE_PATH } from '@/utils/navigation/appRoute';

import { EditorSurfaceProvider, useEditorSurface } from '../_context';
import { useEditorRuntime } from '../_runtime/useEditorRuntime';
import type { EditorPresentation, EditorSurfaceProps } from '../editor.type';
import { buildHtmlDocument } from './htmlDocument';
import styles from './style.module.scss';

interface HtmlFrameProps {
  content: string;
  title: string;
}

function HtmlFrame({ content, title }: HtmlFrameProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  /**
   * @wisepen-manual-effect
   * 执行时机：正文变化并提交到 iframe 后创建只读 Blob 文档。
   * 不可替代原因：Blob URL 是浏览器资源句柄，必须与 React 生命周期配对释放，且写入 iframe 不应经过额外状态。
   * cleanup：撤销当前正文对应的 Blob URL，避免内容刷新或卸载后泄漏对象地址。
   */
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    const assetBaseUrl = getApiBaseUrl();
    const url = URL.createObjectURL(
      new Blob([buildHtmlDocument(content, assetBaseUrl)], { type: 'text/html;charset=utf-8' })
    );
    iframe.src = url;
    return () => URL.revokeObjectURL(url);
  }, [content]);

  return (
    <iframe
      ref={iframeRef}
      className={styles.frame}
      title={title}
      sandbox="allow-scripts"
      referrerPolicy="no-referrer"
    />
  );
}

function HtmlPageContent() {
  const { t } = useTranslation('workspace');
  const { target } = useEditorSurface();
  const { resourceId } = target;
  const htmlPageService = useHtmlPageService();
  const interactionService = useResourceInteractionService();
  const {
    data: info,
    error: infoError,
    loading: infoLoading,
    refresh: refreshInfo,
  } = useApi(() => htmlPageService.getHtmlPageInfo(resourceId!), {
    ready: Boolean(resourceId),
    refreshDeps: [resourceId],
  });
  const ready = isHtmlPageReady(info);
  const {
    data: content,
    error: contentError,
    loading: contentLoading,
    refresh: refreshContent,
  } = useApi(() => htmlPageService.getHtmlPageContent(resourceId!, info!.currentVersion), {
    ready: Boolean(resourceId && ready),
    refreshDeps: [resourceId, info?.currentVersion, ready],
  });
  useApi(() => interactionService.recordResourceRead(resourceId!), {
    ready: Boolean(resourceId),
    refreshDeps: [resourceId],
  });

  const resourceInfo = info?.resourceInfo;
  const resourceName =
    resourceInfo?.resourceName ?? target.resourceName ?? t('html.pageFallbackName');
  const loading = (infoLoading && !info) || (ready && contentLoading && !content);

  useEditorRuntime({
    openedResource: {
      ...target,
      resourceName,
      version: info?.currentVersion,
    },
    loading,
    error: infoError ?? contentError,
    readOnly: true,
    hasUnsavedChanges: false,
    pendingWork: false,
    warnBeforeUnload: false,
  });

  const presentation: EditorPresentation = {
    className: styles.container,
    header: {
      resource: {
        resourceId,
        resourceName,
        resourceType: resourceInfo?.resourceType ?? target.resourceType,
        resourceIconType: 'html',
        resourceInfo,
        currentActions: resourceInfo?.currentActions,
        copyVersion: info?.currentVersion,
        permissionResourceType: RESOURCE_KIND.HTML,
        ownerId: resourceInfo?.ownerId,
        onPermissionSuccess: refreshInfo,
      },
    },
  };

  const renderUnavailable = (title: string, subTitle?: string, retry?: () => void) => (
    <div className={styles.middleOverlay}>
      <div className={styles.middleOverlayInner}>
        <ResultState
          status="warning"
          title={title}
          subTitle={subTitle}
          extra={
            <div className={styles.actions}>
              {retry ? (
                <AppButton variant="secondary" onPress={retry}>
                  {t('html.retry')}
                </AppButton>
              ) : null}
              <Link to={APP_ROUTE_PATH.DRIVE_PERSONAL}>
                <AppButton variant="secondary">{t('viewer.backToDrive')}</AppButton>
              </Link>
            </div>
          }
        />
      </div>
    </div>
  );

  let body;
  if (!resourceId) {
    body = renderUnavailable(t('html.cannotOpen'));
  } else if (infoError) {
    body = renderUnavailable(t('html.cannotOpen'), parseErrorMessage(infoError), refreshInfo);
  } else if (infoLoading && !info) {
    body = (
      <div className={styles.middleOverlay} aria-busy="true" aria-live="polite">
        <div className={styles.middleOverlayLoading}>
          <Spin size="large" />
          <span className={styles.middleOverlayText}>{t('html.loadingInfo')}</span>
        </div>
      </div>
    );
  } else if (!info) {
    body = renderUnavailable(t('html.cannotOpen'), t('html.emptyInfo'), refreshInfo);
  } else if (!ready) {
    const generationFailed =
      info.versionInfo?.status === 'FAILED' ||
      info.versionInfo?.status === 'REGISTERING_RES_TIMEOUT';
    body = renderUnavailable(
      generationFailed ? t('html.generationFailed') : t('html.notGenerated'),
      generationFailed ? undefined : t('html.notGeneratedHint'),
      refreshInfo
    );
  } else if (contentError) {
    body = renderUnavailable(
      t('html.contentFailed'),
      parseErrorMessage(contentError),
      refreshContent
    );
  } else if (contentLoading || content == null) {
    body = (
      <div className={styles.middleOverlay} aria-busy="true" aria-live="polite">
        <div className={styles.middleOverlayLoading}>
          <Spin size="large" />
          <span className={styles.middleOverlayText}>{t('html.loadingContent')}</span>
        </div>
      </div>
    );
  } else {
    body = <HtmlFrame content={content} title={t('html.frameTitle', { name: resourceName })} />;
  }

  return (
    <>
      <EditorPresentationBinding {...presentation} />
      <div className={styles.content}>{body}</div>
    </>
  );
}

export default function HtmlEditor(props: EditorSurfaceProps) {
  return (
    <EditorSurfaceProvider {...props} kind="html">
      <HtmlPageContent />
    </EditorSurfaceProvider>
  );
}
