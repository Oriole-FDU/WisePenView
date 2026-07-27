import { Button, ButtonGroup } from '@heroui/react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import type * as Y from 'yjs';

import type { CustomBlockNoteEditor } from '../../registry/noteEditorComposition';
import type { NoteAiDiffAction, NotePluginRegistry } from '../../registry/types';
import { applyAllNoteAiDiffActions } from './action';
import styles from './style.module.less';

interface AiDiffBulkActionsProps {
  doc: Y.Doc;
  editor: CustomBlockNoteEditor;
  registry: NotePluginRegistry;
  undoManager: Y.UndoManager;
  visible: boolean;
  portalContainer: HTMLElement | null;
}

export function AiDiffBulkActions({
  doc,
  editor,
  registry,
  undoManager,
  visible,
  portalContainer,
}: AiDiffBulkActionsProps) {
  const { t } = useTranslation('note');
  if (!visible || !portalContainer) return null;

  const apply = (action: NoteAiDiffAction) => {
    undoManager.stopCapturing();
    applyAllNoteAiDiffActions({ doc, editor, registry, action });
    undoManager.stopCapturing();
  };
  const preventEditorInteraction = (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
  };

  return createPortal(
    <div className={styles.bulkActions} contentEditable={false}>
      <ButtonGroup size="sm" aria-label={t('aiDiff.actions')}>
        <Button
          variant="secondary"
          aria-label={t('aiDiff.rejectAllLabel')}
          onMouseDown={preventEditorInteraction}
          onPress={() => apply('discard')}
        >
          {t('aiDiff.rejectAll')}
        </Button>
        <Button
          variant="primary"
          aria-label={t('aiDiff.acceptAllLabel')}
          onMouseDown={preventEditorInteraction}
          onPress={() => apply('accept')}
        >
          {t('aiDiff.acceptAll')}
        </Button>
      </ButtonGroup>
    </div>,
    portalContainer
  );
}
