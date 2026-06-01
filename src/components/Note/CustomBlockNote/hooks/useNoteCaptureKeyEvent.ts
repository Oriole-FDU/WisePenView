import type { KeyboardEvent } from 'react';
import { useCallback } from 'react';
import type * as Y from 'yjs';

import type { WisepenProvider } from '@/domains/Note';

/**
 * 捕获阶段接管撤销/重做快捷键，统一走 Y.UndoManager。
 * 同时异步上报 sendIntent，保证埋点来源与快捷键一致。
 */
interface UseNoteCaptureKeyEventOptions {
  provider: WisepenProvider;
  undoManager: Y.UndoManager;
  readOnly: boolean;
}

export function useNoteCaptureKeyEvent({
  provider,
  undoManager,
  readOnly,
}: UseNoteCaptureKeyEventOptions) {
  return useCallback(
    (e: KeyboardEvent<HTMLDivElement>) => {
      if (readOnly) return;

      const emitIntentDeferred = (
        operationType: Parameters<WisepenProvider['sendIntent']>[0],
        source: string
      ) => {
        window.setTimeout(() => {
          provider.sendIntent(operationType, source);
        }, 0);
      };

      const mod = e.metaKey || e.ctrlKey;
      if (!mod) return;

      const raw = e.key;
      const k = raw.length === 1 ? raw.toLowerCase() : raw;

      if (k === 'c') {
        emitIntentDeferred('COPY', e.metaKey ? 'Cmd+C' : 'Ctrl+C');
        return;
      }

      if (k === 'v') {
        emitIntentDeferred('PASTE', e.metaKey ? 'Cmd+V' : 'Ctrl+V');
        return;
      }

      if (k === 'z') {
        if (e.shiftKey) {
          e.preventDefault();
          e.stopPropagation();
          undoManager.redo();
          emitIntentDeferred('REDO', e.metaKey ? 'Cmd+Shift+Z' : 'Ctrl+Shift+Z');
        } else {
          e.preventDefault();
          e.stopPropagation();
          undoManager.undo();
          emitIntentDeferred('UNDO', e.metaKey ? 'Cmd+Z' : 'Ctrl+Z');
        }
        return;
      }

      if (k === 'y' && e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        e.stopPropagation();
        undoManager.redo();
        emitIntentDeferred('REDO', 'Ctrl+Y');
      }
    },
    [provider, readOnly, undoManager]
  );
}
