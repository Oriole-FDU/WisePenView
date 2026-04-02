import { useCallback } from 'react';
import type { KeyboardEvent } from 'react';

import type { NoteIntentOperation, NoteYjsSocket } from '@/connection/plugins/note';

/**
 * 捕获阶段仅上报 sendIntent，不 preventDefault / 不手动 editor.undo。
 * 协作模式下撤销由 BlockNote 内置键位（走 yUndo / UndoManager）处理；此前拦截快捷键再调 undo 易与 Yjs 历史不同步，表现为撤销异常。
 */
export function useNoteCaptureKeyEvent(provider: NoteYjsSocket) {
  return useCallback(
    (e: KeyboardEvent<HTMLDivElement>) => {
      // 异步埋点，避免影响默认按键处理链路
      const emitIntentDeferred = (operationType: NoteIntentOperation, source: string) => {
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

      // 撤销/重做只做异步埋点，不介入默认按键处理链路。
      if (k === 'z') {
        if (e.shiftKey) {
          emitIntentDeferred('REDO', e.metaKey ? 'Cmd+Shift+Z' : 'Ctrl+Shift+Z');
        } else {
          emitIntentDeferred('UNDO', e.metaKey ? 'Cmd+Z' : 'Ctrl+Z');
        }
        return;
      }

      if (k === 'y' && e.ctrlKey && !e.metaKey) {
        emitIntentDeferred('REDO', 'Ctrl+Y');
      }
    },
    [provider]
  );
}
