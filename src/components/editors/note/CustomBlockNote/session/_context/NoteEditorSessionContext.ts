import { createContext } from 'react';

import type { NoteSaveStatus, NoteSessionStatus } from '@/domains/Note';
import type { User } from '@/domains/User';

import type { NoteEditorRuntimeProps } from '../../runtime/runtime.type';

export type NoteEditorSlotName = 'aiBulkActions' | 'findBar' | 'aiDiffControls' | 'title';

export interface NoteEditorSessionValue {
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
