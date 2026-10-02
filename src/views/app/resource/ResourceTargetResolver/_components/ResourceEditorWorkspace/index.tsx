import { useState } from 'react';
import { createStore } from 'zustand/vanilla';

import { ResourceEditor } from '@/components/editors';
import { chatDockActions } from '@/layouts/ChatDockLayout';
import { resourceChatContextActions } from '@/layouts/Resource/_context/chatBinding';
import { useResourceEditor } from '@/layouts/Resource/_context/editor';
import { useResourceHostContext } from '@/layouts/Resource/_context/host';
import { resourceSidePanelActions } from '@/layouts/Resource/ResourceLayout';

import ResourceWorkspacePresentation from './_components/ResourceWorkspacePresentation';
import type { ResourceEditorWorkspaceProps, WorkspacePresentationState } from './index.type';

function createWorkspacePresentationStore() {
  return createStore<WorkspacePresentationState>((set, get) => ({
    presentation: {},
    onPresentationChange: (presentation) => {
      set({ presentation });
      return () => {
        if (get().presentation === presentation) set({ presentation: {} });
      };
    },
  }));
}

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
          openChatPanel: chatDockActions.open,
          setChatContext: resourceChatContextActions.setContext,
          navigateResourceHash: host.navigateResourceHash,
          openInlineComments: resourceSidePanelActions.openInlineComments,
        }}
      />
    </ResourceWorkspacePresentation>
  );
}
