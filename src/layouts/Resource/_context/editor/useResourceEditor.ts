import { useSyncExternalStore } from 'react';

import { useRequiredContext } from '@/hooks/useRequiredContext';

import { ResourceEditorContext } from './ResourceEditorContext';

const emptySubscribe = () => () => {};
const emptySnapshot = () => null;

export function useResourceEditor() {
  const context = useRequiredContext(ResourceEditorContext, 'ResourceEditorProvider');
  const editor = useSyncExternalStore(context.host.subscribe, context.host.getSnapshot);
  const snapshot = useSyncExternalStore(
    editor?.subscribe ?? emptySubscribe,
    editor?.getSnapshot ?? emptySnapshot
  );
  return { ...context, editor, snapshot };
}
