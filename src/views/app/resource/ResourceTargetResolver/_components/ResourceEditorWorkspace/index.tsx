import { useState } from 'react';

import { ResourceEditor } from '@/components/editors';
import { resourceChatContextActions } from '@/layouts/Resource/_context/chatBinding';
import { useResourceEditor } from '@/layouts/Resource/_context/editor';
import { useResourceHostContext } from '@/layouts/Resource/_context/host';
import { workspaceRightPanelActions } from '@/layouts/WorkspaceRightPanelLayout';

import ResourceWorkspacePresentation from './_components/ResourceWorkspacePresentation';
import type { ResourceEditorWorkspaceProps } from './index.type';
import { createWorkspacePresentationStore } from './workspacePresentationStore';

/** 组合外层资源布局与编辑器实例；展示信息由独立子树订阅。 */
export default function ResourceEditorWorkspace({ target }: ResourceEditorWorkspaceProps) {
  const host = useResourceHostContext();
  const { registerEditor } = useResourceEditor();
  const [store] = useState(createWorkspacePresentationStore);

  return (
    <ResourceWorkspacePresentation target={target} store={store}>
      <ResourceEditor
        target={target}
        onRegister={registerEditor}
        onPresentationChange={store.getState().onPresentationChange}
        host={{
          hostId: host.hostId,
          openChatPanel: () => workspaceRightPanelActions.openPanel('chat'),
          setChatContext: resourceChatContextActions.setContext,
          navigateResourceHash: host.navigateResourceHash,
          openInlineComments: () => workspaceRightPanelActions.openPanel('inlineComment'),
        }}
      />
    </ResourceWorkspacePresentation>
  );
}
