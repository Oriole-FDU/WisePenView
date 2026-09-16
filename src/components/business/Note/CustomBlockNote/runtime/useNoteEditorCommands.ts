import { TextSelection } from '@tiptap/pm/state';
import { useMemoizedFn } from 'ahooks';

import { AI_DIFF_DISPLAY_MODE } from '@/domains/Note';

import { exportNoteMarkdown } from '../engines/markdown/markdownExport';
import { printNotePdfViaBrowser, waitForEditorPaint } from '../engines/print/noteBrowserPrint';
import {
  findActiveSearchMatchElement,
  getSearchMatchIndexAtPosition,
  type SearchExtensionMeta,
  searchPluginKey,
} from '../engines/search/extension';
import {
  applyNoteReplaceOperations,
  collectFindReplaceMatches,
  selectNoteReplaceOperations,
} from '../engines/search/findReplace';
import type { NoteBodyEditorHandle, NoteFindResult, NoteReplaceResult } from '../index.type';
import { type CustomBlockNoteEditor, notePluginRegistry } from '../registry/noteEditorComposition';
import { useNoteInteractionStore } from './noteInteractionStore';
import type { NoteScrollTargetResolver } from './useNoteEditorScroll';

type NoteEditorCommands = Pick<
  NoteBodyEditorHandle,
  'focus' | 'openFind' | 'exportPdf' | 'exportMarkdown'
> & {
  find: {
    clearFind: () => void;
    collapseSelection: () => void;
    findMatches: (query: string) => NoteFindResult | null;
    findNext: () => NoteFindResult | null;
    findPrev: () => NoteFindResult | null;
    replaceCurrent: (replacement: string) => NoteReplaceResult;
    replaceAll: (replacement: string) => NoteReplaceResult;
  };
};

export function useNoteEditorCommands(
  editor: CustomBlockNoteEditor,
  scrollToTarget: (resolveTarget: NoteScrollTargetResolver) => void,
  canReplace: boolean
): NoteEditorCommands {
  const dispatch = useNoteInteractionStore((state) => state.dispatch);
  const displayMode = useNoteInteractionStore((state) => state.review.displayMode);
  const dispatchSearchMeta = useMemoizedFn((meta: SearchExtensionMeta) => {
    const view = editor.prosemirrorView;
    view.dispatch(view.state.tr.setMeta(searchPluginKey, meta).setMeta('addToHistory', false));
  });

  const clearFind = useMemoizedFn(() => {
    dispatchSearchMeta({ query: '', matches: [], activeIndex: -1 });
    dispatch({ type: 'FIND_RESULT_CHANGED', result: null });
  });

  const collapseSelection = useMemoizedFn(() => {
    const view = editor.prosemirrorView;
    const { selection } = view.state;
    if (selection.empty) return;

    const tr = view.state.tr;
    tr.setSelection(TextSelection.create(view.state.doc, selection.head));
    tr.setMeta('addToHistory', false);
    view.dispatch(tr);
  });

  const findMatches = useMemoizedFn((query: string): NoteFindResult | null => {
    const trimmedQuery = query.trim();
    if (!trimmedQuery) {
      clearFind();
      return null;
    }

    const view = editor.prosemirrorView;
    const doc = view.state.doc;

    const matches = collectFindReplaceMatches(doc, trimmedQuery, notePluginRegistry);

    if (matches.length > 0) {
      const activeIndex = getSearchMatchIndexAtPosition(matches, view.state.selection.from);
      const tr = view.state.tr;
      tr.setMeta(searchPluginKey, {
        query: trimmedQuery,
        matches,
        activeIndex,
      } satisfies SearchExtensionMeta);
      tr.setMeta('addToHistory', false);
      view.dispatch(tr);
      scrollToTarget(() => findActiveSearchMatchElement(editor.prosemirrorView.dom));
      const result = { current: activeIndex + 1, total: matches.length };
      dispatch({ type: 'FIND_RESULT_CHANGED', result });
      return result;
    } else {
      dispatchSearchMeta({ query: trimmedQuery, matches: [], activeIndex: -1 });
    }

    dispatch({ type: 'FIND_RESULT_CHANGED', result: null });
    return null;
  });

  const findNext = useMemoizedFn((): NoteFindResult | null => {
    const state = searchPluginKey.getState(editor.prosemirrorView.state);
    if (!state || state.matches.length === 0) return null;
    const activeIndex = (state.activeIndex + 1) % state.matches.length;
    const match = state.matches[activeIndex];
    const view = editor.prosemirrorView;
    const doc = view.state.doc;
    if (match.from <= doc.content.size && match.to <= doc.content.size) {
      const tr = view.state.tr;
      tr.setMeta(searchPluginKey, {
        query: state.query,
        matches: state.matches,
        activeIndex,
      } satisfies SearchExtensionMeta);
      tr.setMeta('addToHistory', false);
      view.dispatch(tr);
      scrollToTarget(() => findActiveSearchMatchElement(editor.prosemirrorView.dom));
    }
    const result = { current: activeIndex + 1, total: state.matches.length };
    dispatch({ type: 'FIND_RESULT_CHANGED', result });
    return result;
  });

  const findPrev = useMemoizedFn((): NoteFindResult | null => {
    const state = searchPluginKey.getState(editor.prosemirrorView.state);
    if (!state || state.matches.length === 0) return null;
    const activeIndex = state.activeIndex <= 0 ? state.matches.length - 1 : state.activeIndex - 1;
    const match = state.matches[activeIndex];
    const view = editor.prosemirrorView;
    const doc = view.state.doc;
    if (match.from <= doc.content.size && match.to <= doc.content.size) {
      const tr = view.state.tr;
      tr.setMeta(searchPluginKey, {
        query: state.query,
        matches: state.matches,
        activeIndex,
      } satisfies SearchExtensionMeta);
      tr.setMeta('addToHistory', false);
      view.dispatch(tr);
      scrollToTarget(() => findActiveSearchMatchElement(editor.prosemirrorView.dom));
    }
    const result = { current: activeIndex + 1, total: state.matches.length };
    dispatch({ type: 'FIND_RESULT_CHANGED', result });
    return result;
  });

  const getSearchResult = useMemoizedFn((): NoteFindResult | null => {
    const state = searchPluginKey.getState(editor.prosemirrorView.state);
    if (!state || state.matches.length === 0) return null;
    return { current: state.activeIndex + 1, total: state.matches.length };
  });

  const replaceMatches = useMemoizedFn((replacement: string, replaceAll: boolean) => {
    if (!canReplace) return { replaced: 0, result: getSearchResult() };

    const view = editor.prosemirrorView;
    const state = searchPluginKey.getState(view.state);
    if (!state || state.matches.length === 0) return { replaced: 0, result: null };

    const operations = selectNoteReplaceOperations(
      state.matches,
      state.activeIndex,
      replaceAll,
      canReplace
    );
    if (operations.length === 0) return { replaced: 0, result: getSearchResult() };

    const tr = applyNoteReplaceOperations(view.state.tr, operations, replacement);
    view.dispatch(tr);
    const result = getSearchResult();
    if (result) scrollToTarget(() => findActiveSearchMatchElement(editor.prosemirrorView.dom));
    return { replaced: operations.length, result };
  });

  const replaceCurrent = useMemoizedFn((replacement: string) => replaceMatches(replacement, false));
  const replaceAll = useMemoizedFn((replacement: string) => replaceMatches(replacement, true));

  return {
    focus: () => {
      editor.focus();
    },
    exportPdf: async (options) => {
      try {
        dispatch({
          type: 'REVIEW_DISPLAY_MODE_CHANGED',
          displayMode: AI_DIFF_DISPLAY_MODE.OLD_ONLY,
        });
        await waitForEditorPaint();
        await printNotePdfViaBrowser(editor, notePluginRegistry, {
          title: options?.title,
          titleRoot: options?.titleRoot,
          defaultFileName: options?.defaultFileName,
        });
      } finally {
        dispatch({ type: 'REVIEW_DISPLAY_MODE_CHANGED', displayMode });
      }
    },
    exportMarkdown: () => ({
      content: exportNoteMarkdown(
        editor,
        notePluginRegistry,
        editor.document,
        AI_DIFF_DISPLAY_MODE.OLD_ONLY
      ),
      mimeType: 'text/markdown;charset=utf-8',
      extension: 'md',
    }),
    openFind: (initialQuery) => {
      dispatch({ type: 'FIND_OPEN', initialQuery });
      if (initialQuery) findMatches(initialQuery);
    },
    find: {
      clearFind,
      collapseSelection,
      findMatches,
      findNext,
      findPrev,
      replaceCurrent,
      replaceAll,
    },
  };
}
