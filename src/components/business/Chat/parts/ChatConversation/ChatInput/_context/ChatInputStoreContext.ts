import { createContext } from 'react';

import type { ChatInputStoreApi } from './ChatInputStore';

export const ChatInputStoreContext = createContext<ChatInputStoreApi | null>(null);
