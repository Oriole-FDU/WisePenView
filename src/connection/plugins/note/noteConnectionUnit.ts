import { createConnectionHook } from '@/connection/core/createConnectionHook';
import { RetryStrategies } from '@/connection/core/RetryStrategies';

import { NoteAdapter } from './NoteAdapter';
import { NoteDataFlow } from './NoteDataFlow';

export const NoteConnectionUnit = {
  type: 'note',
  Adapter: NoteAdapter,
  DataFlow: NoteDataFlow,
  config: {
    retryStrategy: RetryStrategies.exponential(),
    lingerTime: 3000,
  },
} as const;

export const useNoteConnection = createConnectionHook(NoteConnectionUnit);
