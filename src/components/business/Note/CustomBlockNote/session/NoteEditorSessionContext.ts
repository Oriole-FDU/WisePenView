import { createContext, useContext } from 'react';

import type { NoteSaveStatus, NoteSessionStatus } from '@/domains/Note';
import type { User } from '@/domains/User';
import { createClientError, FRONTEND_CLIENT_ERROR } from '@/utils/error';

import type { NoteEditorRuntimeProps } from '../runtime/runtime.type';

export type NoteEditorSlotName = 'aiBulkActions' | 'findBar' | 'aiDiffControls' | 'title';

interface NoteEditorSessionValue {
  runtime: Pick<
    NoteEditorRuntimeProps,
    'resourceId' | 'collaboration' | 'state' | 'aiDiffPreview' | 'portalContainers'
  >;
  ui: {
    status: NoteSessionStatus;
    saveStatus: NoteSaveStatus;
    reconnect: () => void;
    currentUser?: User;
    isConnected: boolean;
    isDisconnected: boolean;
    isTitleReadOnly: boolean;
    canRenderBodyEditor: boolean;
    showFullPageSpin: boolean;
    middleOverlayText: string;
  };
  titleContainer: HTMLElement | null;
  setSlot: (name: NoteEditorSlotName, node: HTMLElement | null) => void;
}

export const NoteEditorSessionContext = createContext<NoteEditorSessionValue | null>(null);

export function useNoteEditorSessionContext() {
  const context = useContext(NoteEditorSessionContext);
  if (!context)
    throw createClientError(FRONTEND_CLIENT_ERROR.INTERNAL_STATE, {
      reason: '笔记编辑能力必须在 NoteEditorSession 内使用',
    });
  return context;
}
