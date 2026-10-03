import { useState } from 'react';

import { ResourceEditor } from '@/components/editors';
import { createEditorPresentationStore } from '@/components/editors/_runtime/editorPresentationStore';
import EditorWorkspacePresentation from '@/components/editors/_runtime/EditorWorkspacePresentation';
import { chatDockActions } from '@/layouts/ChatDockLayout';
import { resourceChatContextActions } from '@/layouts/Resource/_context/chatBinding';
import { useResourceEditor } from '@/layouts/Resource/_context/editor';
import { useResourceHostContext } from '@/layouts/Resource/_context/host';
import { resourceSidePanelActions } from '@/layouts/Resource/ResourceLayout';

import type { ResourceEditorWorkspaceProps } from './index.type';

/** 组合外层资源布局与编辑器实例；展示信息由独立子树订阅。 */
export default function ResourceEditorWorkspace({ target }: ResourceEditorWorkspaceProps) {
  const host = useResourceHostContext();
  const { registerEditor } = useResourceEditor();
  const [store] = useState(createEditorPresentationStore);

  return (
    <EditorWorkspacePresentation target={target} store={store}>
      <ResourceEditor
        target={target}
        onRegister={registerEditor}
        onPresentationChange={store.getState().onPresentationChange}
        host={{
          hostId: host.hostId,
          openChatPanel: chatDockActions.open,
          setChatContext: resourceChatContextActions.setContext,
          navigateResourceHash: host.navigateResourceHash,
          openInlineComments: resourceSidePanelActions.openInlineComments,
        }}
      />
    </EditorWorkspacePresentation>
  );
}
