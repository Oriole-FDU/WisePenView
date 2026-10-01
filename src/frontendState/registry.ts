import { createClientError, FRONTEND_CLIENT_ERROR } from '@/utils/error';

import type { FrontendStateEntry, FrontendStateKey, FrontendStateValues } from './definitions';

interface SourceStates {
  entries: FrontendStateEntry[];
  resourceId?: string;
  revision: number;
}

interface SetStatesOptions {
  source: string;
  resourceId?: string;
  entries: FrontendStateEntry[];
}

interface ClearStatesOptions {
  source: string;
  revision?: number;
}

const STATE_ORDER: FrontendStateKey[] = [
  'workspace_open_resource',
  'note_client_content_signature',
  'selected_text',
  'selected_note_scope',
  'selected_resources',
  'time',
  'locale',
];

export function createFrontendStateRegistry(
  readBuiltins: () => {
    time: FrontendStateValues['time'];
    locale: FrontendStateValues['locale'];
  }
) {
  const sources = new Map<string, SourceStates>();
  const listeners = new Set<() => void>();
  let nextRevision = 0;

  const notify = () => listeners.forEach((listener) => listener());

  const clearFrontendStates = ({ source, revision }: ClearStatesOptions): void => {
    const current = sources.get(source);
    if (!current || (revision !== undefined && current.revision !== revision)) return;
    sources.delete(source);
    notify();
  };

  const setFrontendStates = ({ source, resourceId, entries }: SetStatesOptions): number => {
    const keys = new Set<string>();
    for (const entry of entries) {
      if (entry.key === 'time' || entry.key === 'locale') {
        throw createClientError(FRONTEND_CLIENT_ERROR.INTERNAL_STATE, {
          reason: `frontend_state ${entry.key} 只能在读取时生成`,
        });
      }
      if (keys.has(entry.key)) {
        throw createClientError(FRONTEND_CLIENT_ERROR.INTERNAL_STATE, {
          reason: `frontend_state 重复 key: ${entry.key}`,
        });
      }
      keys.add(entry.key);
      for (const [otherSource, states] of sources) {
        if (otherSource !== source && states.entries.some((item) => item.key === entry.key)) {
          throw createClientError(FRONTEND_CLIENT_ERROR.INTERNAL_STATE, {
            reason: `frontend_state ${entry.key} 已由 ${otherSource} 写入`,
          });
        }
      }
    }
    const revision = ++nextRevision;
    sources.set(source, { entries, resourceId, revision });
    notify();
    return revision;
  };

  const getFrontendStateValue = <Key extends FrontendStateKey>(
    key: Key
  ): FrontendStateValues[Key] | undefined => {
    for (const source of sources.values()) {
      const entry = source.entries.find((item) => item.key === key);
      if (entry) return entry.value as FrontendStateValues[Key];
    }
    return undefined;
  };

  const readFrontendStates = ({ resourceId }: { resourceId?: string } = {}) => {
    const selection = sources.get('selection');
    const resourceMismatch = Boolean(selection && selection.resourceId !== resourceId);
    const entries = Array.from(sources.entries())
      .filter(
        ([source, state]) =>
          source === 'input' || state.resourceId === undefined || state.resourceId === resourceId
      )
      .flatMap(([, state]) => state.entries);
    const { time, locale } = readBuiltins();
    const states: FrontendStateEntry[] = [
      ...entries,
      { key: 'time', value: time },
      { key: 'locale', value: locale },
    ];
    states.sort((left, right) => STATE_ORDER.indexOf(left.key) - STATE_ORDER.indexOf(right.key));
    const selectedRevisions = {
      selection: sources.get('selection')?.revision,
      input: sources.get('input')?.revision,
    };
    return {
      states,
      resourceMismatch,
      finishSend: () => {
        if (selectedRevisions.selection !== undefined) {
          clearFrontendStates({
            source: 'selection',
            revision: selectedRevisions.selection,
          });
        }
        if (selectedRevisions.input !== undefined) {
          clearFrontendStates({ source: 'input', revision: selectedRevisions.input });
        }
      },
    };
  };

  return {
    setFrontendStates,
    clearFrontendStates,
    readFrontendStates,
    getFrontendStateValue,
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    reset: () => {
      sources.clear();
      notify();
    },
  };
}
