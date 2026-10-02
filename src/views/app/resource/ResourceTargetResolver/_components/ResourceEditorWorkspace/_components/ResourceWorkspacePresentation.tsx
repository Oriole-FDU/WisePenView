import { FilePenLine, FileText, PanelRightClose, PanelRightOpen } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useStore } from 'zustand';

import AppIconButton from '@/components/base/Button/AppIconButton';
import { resolveEditorKind } from '@/components/editors';
import {
  isOfficeResourceType,
  RESOURCE_KIND,
  RESOURCE_VIEWER,
} from '@/domains/Resource/model/resourceTarget';
import { useChatDockState } from '@/layouts/ChatDockLayout';
import { ResourceChatBinding } from '@/layouts/Resource/_context/chatBinding';
import { useResourceHostContext } from '@/layouts/Resource/_context/host';
import { ResourceLayout } from '@/layouts/Resource/ResourceLayout';

import type { ResourceWorkspacePresentationProps } from '../index.type';

/** 单独订阅展示信息，保留正文 children 的引用，避免上报触发编辑器重复渲染。 */
export default function ResourceWorkspacePresentation({
  target,
  store,
  children,
}: ResourceWorkspacePresentationProps) {
  const { t } = useTranslation('workspace');
  const { t: tChat } = useTranslation('chat');
  const { collapsed, toggle } = useChatDockState();
  const host = useResourceHostContext();
  const kind = resolveEditorKind(target);
  const presentation = useStore(store, (state) => state.presentation);
  const { document, chat, ...workspace } = presentation;
  if (document) {
    const { resourceInfo, documentType, onPermissionSuccess, onResourceChanged } = document;
    workspace.sidePanel = resourceInfo ? { resource: resourceInfo, onResourceChanged } : undefined;
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
  return (
    <ResourceLayout
      {...workspace}
      headerTrailingActions={
        <AppIconButton
          icon={
            collapsed ? (
              <PanelRightOpen size={18} aria-hidden="true" />
            ) : (
              <PanelRightClose size={18} aria-hidden="true" />
            )
          }
          label={collapsed ? tChat('panel.expand') : tChat('panel.collapse')}
          size="sm"
          onPress={toggle}
        />
      }
    >
      {chat ? <ResourceChatBinding resourceId={target.resourceId} {...chat} /> : null}
      {children}
    </ResourceLayout>
  );
}
