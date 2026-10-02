import type { ReactNode } from 'react';
import type { StoreApi } from 'zustand';

import type { EditorPresentation, EditorTarget } from '@/components/editors';

export interface ResourceEditorWorkspaceProps {
  target: EditorTarget;
}

export interface WorkspacePresentationState {
  presentation: EditorPresentation;
  onPresentationChange(presentation: EditorPresentation): () => void;
}

export interface ResourceWorkspacePresentationProps {
  target: EditorTarget;
  store: StoreApi<WorkspacePresentationState>;
  children: ReactNode;
}
