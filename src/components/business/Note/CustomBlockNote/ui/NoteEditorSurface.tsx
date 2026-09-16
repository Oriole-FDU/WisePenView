import { BlockNoteView } from '@blocknote/mantine';
import { Tabs } from '@heroui/react';
import { useEventListener } from 'ahooks';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';

import { AI_DIFF_DISPLAY_MODE, type AiDiffDisplayMode } from '@/domains/Note';
import { useAppTheme } from '@/theme';
import FindBar from '@/views/resource/note/_components/FindBar';

import { AiDiffBulkActions } from '../engines/aiDiff/BulkActions';
import { NoteEditorReadOnlyProvider } from '../engines/editor/readOnly';
import type { CustomBlockNoteProps } from '../index.type';
import { NoteEmojiPickerPopover } from '../plugins/EmojiPlugin/EmojiPickerPopover';
import NoteTableHandles from '../plugins/TablePlugin/ui/tableHandles';
import { type CustomBlockNoteEditor, notePluginRegistry } from '../registry/noteEditorComposition';
import type { NoteEditorRuntimeCoordinator } from '../registry/useNoteEditorRuntimeCoordinator';
import { useNoteInteractionStore } from '../runtime/noteInteractionStore';
import styles from '../style.module.less';
import NoteSideMenu from './sideMenu';
import NoteSlashMenu from './slashMenu';
import NoteToolbar from './toolbar';

function NoteFindBar({
  runtimeCoordinator,
  portalContainer,
}: {
  runtimeCoordinator: NoteEditorRuntimeCoordinator;
  portalContainer: HTMLElement | null;
}) {
  const access = useNoteInteractionStore((state) => state.access);
  const find = useNoteInteractionStore((state) => state.find);
  const dispatch = useNoteInteractionStore((state) => state.dispatch);
  const canReplace = !access.readOnly && !access.blockLocalDocWrites;

  const handleClose = () => {
    runtimeCoordinator.find.clearFind();
    dispatch({ type: 'FIND_CLOSE' });
    runtimeCoordinator.commands.focus();
  };
  const handleQueryChange = (query: string) => {
    dispatch({ type: 'FIND_QUERY_CHANGED', query });
    runtimeCoordinator.find.findMatches(query);
  };
  const handleReplacementChange = (replacement: string) =>
    dispatch({ type: 'FIND_REPLACEMENT_CHANGED', replacement });
  const handleReplace = (replaceAll: boolean) => {
    if (!canReplace) return;
    const result = replaceAll
      ? runtimeCoordinator.find.replaceAll(find.replacement)
      : runtimeCoordinator.find.replaceCurrent(find.replacement);
    dispatch({ type: 'FIND_RESULT_CHANGED', result: result.result });
    dispatch({ type: 'FIND_REPLACED', count: result.replaced });
  };
  const handleKeyDown = (event: KeyboardEvent) => {
    if (!find.active || event.isComposing) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      handleClose();
      return;
    }
    if (!(event.target instanceof HTMLElement) || !event.target.closest('[role="search"]')) return;
    if (event.key !== 'Enter') return;
    event.preventDefault();
    event.stopPropagation();
    if (event.ctrlKey || event.metaKey) {
      handleReplace(event.shiftKey);
    } else if (event.shiftKey) {
      runtimeCoordinator.find.findPrev();
    } else {
      runtimeCoordinator.find.findNext();
    }
  };

  useEventListener('keydown', handleKeyDown, { target: document, capture: true });

  if (!find.active || !portalContainer) return null;

  return createPortal(
    <FindBar
      query={find.query}
      replacement={find.replacement}
      result={find.result}
      replaced={find.replaced}
      canReplace={canReplace}
      onQueryChange={handleQueryChange}
      onReplacementChange={handleReplacementChange}
      onPrevious={runtimeCoordinator.find.findPrev}
      onNext={runtimeCoordinator.find.findNext}
      onReplaceCurrent={() => handleReplace(false)}
      onReplaceAll={() => handleReplace(true)}
      onClose={handleClose}
    />,
    portalContainer
  );
}

function NoteAiDiffControls({ portalContainer }: { portalContainer: HTMLElement | null }) {
  const { t } = useTranslation('note');
  const displayMode = useNoteInteractionStore((state) => state.review.displayMode);
  const hasContent = useNoteInteractionStore((state) => state.review.hasContent);
  const dispatch = useNoteInteractionStore((state) => state.dispatch);

  if (!hasContent || !portalContainer) return null;

  return createPortal(
    <Tabs
      variant="secondary"
      className={styles.aiDiffDisplayModeSwitch}
      selectedKey={displayMode}
      onSelectionChange={(key) =>
        dispatch({
          type: 'REVIEW_DISPLAY_MODE_CHANGED',
          displayMode: String(key) as AiDiffDisplayMode,
        })
      }
    >
      <Tabs.ListContainer>
        <Tabs.List className={styles.aiDiffDisplayModeList} aria-label={t('aiDiff.displayMode')}>
          {[
            { value: AI_DIFF_DISPLAY_MODE.OLD_ONLY, label: t('aiDiff.mode.oldOnly') },
            { value: AI_DIFF_DISPLAY_MODE.NEW_ONLY, label: t('aiDiff.mode.newOnly') },
            { value: AI_DIFF_DISPLAY_MODE.COMPARE, label: t('aiDiff.mode.compare') },
          ].map((option) => (
            <Tabs.Tab key={option.value} id={option.value} className={styles.aiDiffDisplayModeTab}>
              {option.label}
              <Tabs.Indicator />
            </Tabs.Tab>
          ))}
        </Tabs.List>
      </Tabs.ListContainer>
    </Tabs>,
    portalContainer
  );
}

export function NoteEditorSurface({
  editor,
  runtimeCoordinator,
  props,
}: {
  editor: CustomBlockNoteEditor;
  runtimeCoordinator: NoteEditorRuntimeCoordinator;
  props: CustomBlockNoteProps;
}) {
  const { resolvedTheme } = useAppTheme();
  const {
    collaboration: { doc },
    portalContainers: {
      aiBulkActions: aiBulkActionsPortalContainer,
      aiDiffControls: aiDiffControlsPortalContainer,
      findBar: findBarPortalContainer,
    },
  } = props;
  const findActive = useNoteInteractionStore((state) => state.find.active);
  const access = useNoteInteractionStore((state) => state.access);
  const review = useNoteInteractionStore((state) => state.review);
  const bodyReadOnly =
    access.readOnly || access.blockLocalDocWrites || review.hasContent || findActive;

  return (
    <div
      className={styles.editorShell}
      onKeyDownCapture={runtimeCoordinator.collaboration.onKeyDownCapture}
    >
      <AiDiffBulkActions
        doc={doc}
        editor={editor}
        registry={notePluginRegistry}
        undoManager={runtimeCoordinator.collaboration.undoManager}
        visible={runtimeCoordinator.aiDiff.showBulkActions}
        portalContainer={aiBulkActionsPortalContainer}
      />
      <NoteFindBar
        runtimeCoordinator={runtimeCoordinator}
        portalContainer={findBarPortalContainer}
      />
      <NoteAiDiffControls portalContainer={aiDiffControlsPortalContainer} />
      <NoteEditorReadOnlyProvider value={bodyReadOnly}>
        <BlockNoteView
          className="bodyBlockNoteView"
          editor={editor}
          theme={resolvedTheme}
          formattingToolbar={false}
          slashMenu={false}
          emojiPicker={false}
          sideMenu={false}
          tableHandles={false}
          editable={!bodyReadOnly}
          onSelectionChange={runtimeCoordinator.handleSelectionChange}
        >
          <NoteToolbar
            onAskAi={runtimeCoordinator.document.handleAskAi}
            onAddComment={runtimeCoordinator.inlineComments.handleCreate}
            onOpenFind={runtimeCoordinator.editorHandle.openFind}
            isFindModeActive={findActive}
          />
          <NoteEmojiPickerPopover />
          <NoteSlashMenu editor={editor} plugins={notePluginRegistry.contentPlugins} />
          <NoteSideMenu plugins={notePluginRegistry.contentPlugins} />
          <NoteTableHandles />
        </BlockNoteView>
      </NoteEditorReadOnlyProvider>
    </div>
  );
}
