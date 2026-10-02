import { FilePenLine, FileText } from 'lucide-react';
import { type ReactNode, useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { EditorPresentation, EditorTarget } from '@/components/editors';
import { editorRegistry, resolveEditorKind } from '@/components/editors';
import {
  isOfficeResourceType,
  RESOURCE_KIND,
  RESOURCE_VIEWER,
} from '@/domains/Resource/model/resourceTarget';
import {
  ResourceChatBinding,
  useResourceEditor,
  useResourceHostContext,
} from '@/layouts/Resource/_context';

import ResourceWorkspace from './_components/ResourceWorkspace';
import { useResourceSidePanelStore } from './_store/useResourceSidePanelStore';

export type ResolvedResourceTarget = EditorTarget;

function ResolvedEditor({ target }: { target: EditorTarget }) {
  const { t } = useTranslation('workspace');
  const host = useResourceHostContext();
  const { registerEditor } = useResourceEditor();
  const [instanceId] = useState(() => `${host.hostId}:${crypto.randomUUID()}`);
  const kind = resolveEditorKind(target);
  if (!kind) return null;
  const Surface = editorRegistry[kind];
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
      <ResourceWorkspace {...workspace}>
        {chat ? <ResourceChatBinding resourceId={target.resourceId} {...chat} /> : null}
        {body}
      </ResourceWorkspace>
    );
  };
  return (
    <Surface
      target={target}
      instanceId={instanceId}
      onRegister={registerEditor}
      renderWorkspace={renderWorkspace}
      host={{
        openChatPanel: host.openChatPanel,
        setChatContext: host.setChatContext,
        navigateResourceHash: host.navigateResourceHash,
        openInlineComments: (resourceId) =>
          useResourceSidePanelStore.getState().setMode(resourceId, 'inlineComment'),
      }}
    />
  );
}

export default function ResourceRenderer({ target }: { target: EditorTarget }) {
  return (
    <ResolvedEditor key={`${target.resourceId}:${resolveEditorKind(target)}`} target={target} />
  );
}
