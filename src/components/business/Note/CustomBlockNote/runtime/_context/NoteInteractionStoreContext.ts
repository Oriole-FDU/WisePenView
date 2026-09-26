import { createContext } from 'react';

import type { NoteInteractionStoreApi } from '../noteInteractionStore';

export const NoteInteractionStoreContext = createContext<NoteInteractionStoreApi | null>(null);
