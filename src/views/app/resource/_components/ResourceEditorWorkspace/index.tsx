import { FilePenLine, FileText } from 'lucide-react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import {
  type EditorPresentation,
  type EditorTarget,
  resolveEditorKind,
  ResourceEditor,
} from '@/components/editors';
import {
  isOfficeResourceType,
  RESOURCE_KIND,
  RESOURCE_VIEWER,
} from '@/domains/Resource/model/resourceTarget';
import { chatDockActions } from '@/layouts/ChatDockLayout';
import {
  ResourceChatBinding,
  resourceChatContextActions,
} from '@/layouts/Resource/_context/chatBinding';
import { useResourceEditor } from '@/layouts/Resource/_context/editor';
import { useResourceHostContext } from '@/layouts/Resource/_context/host';
import { ResourceLayout, resourceSidePanelActions } from '@/layouts/Resource/ResourceLayout';
import ResourceChatToggleButton from '@/views/app/resource/_components/ResourceChatToggleButton';

/**
 * 把编辑器挂载进资源工作区。
 * 顶栏、侧栏与聊天绑定属于资源视图，在这里装配；编辑器只上报领域展示信息。
 */
export default function ResourceEditorWorkspace({ target }: { target: EditorTarget }) {
  const { t } = useTranslation('workspace');
  const host = useResourceHostContext();
  const { registerEditor } = useResourceEditor();
  const kind = resolveEditorKind(target);

  const renderWorkspace = (presentation: EditorPresentation, body: ReactNode) => {
    const { document, chat, ...workspace } = presentation;
    if (document) {
      const { resourceInfo, documentType, onPermissionSuccess, onResourceChanged } = document;
      workspace.sidePanel = resourceInfo
        ? { resource: resourceInfo, onResourceChanged }
        : undefined;
      const nextViewer = kind === 'pdf' ? RESOURCE_VIEWER.OFFICE : RESOURCE_VIEWER.PDF_PREVIEW;
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
                        id: `open-with-${nextViewer}`,
                        label: t(kind === 'pdf' ? 'pdf.openWithOffice' : 'office.openWithPdf'),
                        icon: kind === 'pdf' ? FilePenLine : FileText,
                        onAction: () =>
                          host.switchResourceViewer({
                            resourceId: target.resourceId,
                            viewer: nextViewer,
                          }),
                      },
                    ],
                  }
                : undefined,
            },
          }
        : {};
    }
    return (
      <ResourceLayout {...workspace} headerTrailingActions={<ResourceChatToggleButton />}>
        {chat ? <ResourceChatBinding resourceId={target.resourceId} {...chat} /> : null}
        {body}
      </ResourceLayout>
    );
  };

  return (
    <ResourceEditor
      target={target}
      onRegister={registerEditor}
      renderWorkspace={renderWorkspace}
      host={{
        hostId: host.hostId,
        openChatPanel: chatDockActions.open,
        setChatContext: resourceChatContextActions.setContext,
        navigateResourceHash: host.navigateResourceHash,
        openInlineComments: resourceSidePanelActions.openInlineComments,
      }}
    />
  );
}
