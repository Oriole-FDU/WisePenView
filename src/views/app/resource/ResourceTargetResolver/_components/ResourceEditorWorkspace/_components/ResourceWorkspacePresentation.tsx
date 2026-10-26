import { FilePenLine, FileText } from 'lucide-react';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useStore } from 'zustand';

import ResourceInteractionPanel from '@/components/business/Resource/ResourceInteractionPanel';
import { resolveEditorKind } from '@/components/editors';
import {
  isOfficeResourceType,
  RESOURCE_KIND,
  RESOURCE_VIEWER,
} from '@/domains/Resource/model/resourceTarget';
import { ResourceChatBinding } from '@/layouts/Resource/_context/chatBinding';
import { useResourceHostContext } from '@/layouts/Resource/_context/host';
import { ResourceLayout } from '@/layouts/Resource/ResourceLayout';
import { useWorkspaceRightPanel, WorkspacePanelPortal } from '@/layouts/WorkspaceRightPanelLayout';

import type { ResourceWorkspacePresentationProps } from '../index.type';
import ResourceInlineCommentPanel from './ResourceInlineCommentPanel';
import ResourceWorkspacePanelActions from './ResourceWorkspacePanelActions';

/** 单独订阅展示信息，保留正文 children 的引用，避免上报触发编辑器重复渲染。 */
export default function ResourceWorkspacePresentation({
  target,
  store,
  children,
}: ResourceWorkspacePresentationProps) {
  const { t } = useTranslation('workspace');
  const host = useResourceHostContext();
  const kind = resolveEditorKind(target);
  const presentation = useStore(store, (state) => state.presentation);
  const { activePanelId, closePanel } = useWorkspaceRightPanel();
  const { document, chat, sidePanel, ...workspace } = presentation;
  const resourceInfo = document?.resourceInfo ?? sidePanel?.resource;
  const onResourceChanged = document?.onResourceChanged ?? sidePanel?.onResourceChanged;
  const inlineComment = sidePanel?.inlineComment;
  const inlineCommentAvailable = Boolean(inlineComment);
  const interactAvailable = Boolean(resourceInfo);
  const hasPresentation =
    presentation.header !== undefined ||
    presentation.document !== undefined ||
    presentation.sidePanel !== undefined;

  if (document) {
    const { documentType, onPermissionSuccess } = document;
    const alternativeViewer = kind === 'pdf' ? RESOURCE_VIEWER.OFFICE : RESOURCE_VIEWER.PDF_PREVIEW;
    workspace.header = resourceInfo
      ? {
          resource: {
            resourceId: resourceInfo.resourceId,
            resourceName: resourceInfo.resourceName,
            resourceType: resourceInfo.resourceType,
            resourceInfo,
            currentActions: resourceInfo.currentActions,
            permissionResourceType: RESOURCE_KIND.FILE,
            ownerId: resourceInfo.ownerId,
            onPermissionSuccess,
            moreMenu: isOfficeResourceType(documentType)
              ? {
                  actions: [
                    {
                      id: `open-with-${alternativeViewer}`,
                      label: t(kind === 'pdf' ? 'pdf.openWithOffice' : 'office.openWithPdf'),
                      icon: kind === 'pdf' ? FilePenLine : FileText,
                      onAction: () =>
                        host.switchResourceViewer({
                          resourceId: target.resourceId,
                          viewer: alternativeViewer,
                        }),
                    },
                  ],
                }
              : undefined,
          },
        }
      : {};
  }

  /**
   * @wisepen-manual-effect
   * 执行时机：当前资源或编辑器切换后，右栏内容的可用性发生变化。
   * 不可替代原因：只有资源工作区同时知道当前激活面板和当前编辑器上报的可用内容。
   * cleanup：没有订阅或延迟任务，无需清理。
   */
  useEffect(() => {
    if (!hasPresentation) return;
    if (
      (activePanelId === 'inlineComment' && !inlineCommentAvailable) ||
      (activePanelId === 'interact' && !interactAvailable)
    ) {
      closePanel();
    }
  }, [activePanelId, closePanel, hasPresentation, inlineCommentAvailable, interactAvailable]);

  return (
    <>
      <WorkspacePanelPortal panelId="inlineComment">
        {inlineComment ? (
          <ResourceInlineCommentPanel onClose={closePanel}>
            {inlineComment}
          </ResourceInlineCommentPanel>
        ) : null}
      </WorkspacePanelPortal>
      <WorkspacePanelPortal panelId="interact">
        {resourceInfo ? (
          <ResourceInteractionPanel
            resource={resourceInfo}
            onResourceChanged={onResourceChanged}
            onClose={closePanel}
          />
        ) : null}
      </WorkspacePanelPortal>
      <ResourceLayout
        {...workspace}
        headerTrailingActions={
          <ResourceWorkspacePanelActions
            inlineCommentAvailable={inlineCommentAvailable}
            interactAvailable={interactAvailable}
          />
        }
      >
        {chat ? <ResourceChatBinding resourceId={target.resourceId} {...chat} /> : null}
        {children}
      </ResourceLayout>
    </>
  );
}
