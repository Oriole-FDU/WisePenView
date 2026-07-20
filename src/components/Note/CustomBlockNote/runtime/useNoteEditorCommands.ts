import type { AiDiffDisplayMode } from '@/domains/Note';
import { AI_DIFF_DISPLAY_MODE } from '@/domains/Note';
import { TextSelection } from '@tiptap/pm/state';
import { useMemoizedFn, useUnmount } from 'ahooks';
import { useMemo, useRef, type Dispatch, type SetStateAction } from 'react';

import { exportNoteMarkdown } from '../engines/markdown/markdownExport';
import { printNotePdfViaBrowser, waitForEditorPaint } from '../engines/print/noteBrowserPrint';
import { searchPluginKey, type SearchExtensionMeta } from '../engines/search/extension';
import type { NoteBodyEditorHandle, NoteEditorAnchor, NoteFindResult } from '../index.type';
import { notePluginRegistry, type CustomBlockNoteEditor } from '../noteEditorComposition';

function resolveCurrentBlockElement(editor: CustomBlockNoteEditor): HTMLElement | null {
  const view = editor.prosemirrorView;
  const domNode = view.domAtPos(view.state.selection.from).node;
  const element = domNode instanceof Element ? domNode : domNode.parentElement;
  return element?.closest<HTMLElement>('.bn-block-outer') ?? null;
}

function useNoteScroll(editor: CustomBlockNoteEditor) {
  const queuedFrameRef = useRef<number | null>(null);

  useUnmount(() => {
    if (queuedFrameRef.current !== null) window.cancelAnimationFrame(queuedFrameRef.current);
  });

  return useMemoizedFn((anchor: NoteEditorAnchor) => {
    if (queuedFrameRef.current !== null) window.cancelAnimationFrame(queuedFrameRef.current);

    let blockElement: HTMLElement | null = null;
    if (anchor.kind === 'block') {
      try {
        editor.setTextCursorPosition(anchor.blockId, 'start');
        editor.focus();
        blockElement = resolveCurrentBlockElement(editor);
      } catch {
        editor.focus();
        return;
      }
    }

    queuedFrameRef.current = window.requestAnimationFrame(() => {
      queuedFrameRef.current = null;
      const target =
        anchor.kind === 'block'
          ? blockElement
          : editor.prosemirrorView.dom.querySelector<HTMLElement>(
              `[data-inline-comment-thread-id="${CSS.escape(anchor.threadId)}"]`
            );
      if (!target?.isConnected) return;
      const behavior = window.matchMedia('(prefers-reduced-motion: reduce)').matches
        ? 'auto'
        : 'smooth';
      target.scrollIntoView({ behavior, block: 'center', inline: 'nearest' });
    });
  });
}

export function useNoteEditorCommands(
  editor: CustomBlockNoteEditor,
  setExportDisplayModeOverride: Dispatch<SetStateAction<AiDiffDisplayMode | null>>
): NoteBodyEditorHandle {
  const scrollToAnchor = useNoteScroll(editor);

  const findStateRef = useRef<{
    matches: { from: number; to: number }[];
    currentIndex: number;
    originalSelection: { from: number; to: number } | null;
  }>({
    matches: [],
    currentIndex: -1,
    originalSelection: null,
  });

  const scrollMatchIntoView = useMemoizedFn((from: number) => {
    const view = editor.prosemirrorView;
    const domNode = view.domAtPos(from).node;
    const element = domNode instanceof Element ? domNode : domNode.parentElement;
    if (element?.isConnected) {
      const behavior = window.matchMedia('(prefers-reduced-motion: reduce)').matches
        ? 'auto'
        : 'smooth';
      element.scrollIntoView({ behavior, block: 'center', inline: 'nearest' });
    }
  });

  const dispatchSearchMeta = useMemoizedFn((meta: SearchExtensionMeta) => {
    const view = editor.prosemirrorView;
    view.dispatch(view.state.tr.setMeta(searchPluginKey, meta).setMeta('addToHistory', false));
  });

  const clearFind = useMemoizedFn(() => {
    const state = findStateRef.current;
    const view = editor.prosemirrorView;

    // Clear search decorations
    dispatchSearchMeta({ query: '', matches: [], activeIndex: -1 });

    // Restore original selection if saved
    if (state.originalSelection) {
      const { from, to } = state.originalSelection;
      const doc = view.state.doc;
      if (from <= doc.content.size && to <= doc.content.size) {
        const tr = view.state.tr;
        tr.setSelection(TextSelection.create(doc, from, to));
        view.dispatch(tr);
      }
    }

    state.matches = [];
    state.currentIndex = -1;
    state.originalSelection = null;
  });

  const findMatches = useMemoizedFn((query: string): number => {
    clearFind();
    const trimmedQuery = query.trim();
    if (!trimmedQuery) return 0;

    const view = editor.prosemirrorView;
    const doc = view.state.doc;
    const lowerQuery = trimmedQuery.toLowerCase();

    const state = findStateRef.current;
    state.originalSelection = {
      from: view.state.selection.from,
      to: view.state.selection.to,
    };

    const matches: { from: number; to: number }[] = [];
    doc.descendants((node, pos) => {
      if (!node.isText) return;
      const text = node.text ?? '';
      const lowerText = text.toLowerCase();
      let searchFrom = 0;
      while (searchFrom < lowerText.length) {
        const idx = lowerText.indexOf(lowerQuery, searchFrom);
        if (idx === -1) break;
        matches.push({ from: pos + idx, to: pos + idx + trimmedQuery.length });
        searchFrom = idx + 1;
      }
    });

    state.matches = matches;

    if (matches.length > 0) {
      state.currentIndex = 0;
      // Dispatch decorations + selection together
      const tr = view.state.tr;
      tr.setMeta(searchPluginKey, {
        query: trimmedQuery,
        matches,
        activeIndex: 0,
      } satisfies SearchExtensionMeta);
      tr.setMeta('addToHistory', false);
      tr.setSelection(TextSelection.create(doc, matches[0].from, matches[0].to));
      view.dispatch(tr);
      scrollMatchIntoView(matches[0].from);
    } else {
      // Dispatch empty to ensure decorations are cleared
      dispatchSearchMeta({ query: trimmedQuery, matches: [], activeIndex: -1 });
    }

    return matches.length;
  });

  const findNext = useMemoizedFn((): NoteFindResult | null => {
    const state = findStateRef.current;
    if (state.matches.length === 0) return null;
    state.currentIndex = (state.currentIndex + 1) % state.matches.length;
    const match = state.matches[state.currentIndex];
    const view = editor.prosemirrorView;
    const doc = view.state.doc;
    if (match.from <= doc.content.size && match.to <= doc.content.size) {
      const tr = view.state.tr;
      tr.setMeta(searchPluginKey, {
        query: '',
        matches: state.matches,
        activeIndex: state.currentIndex,
      } satisfies SearchExtensionMeta);
      tr.setMeta('addToHistory', false);
      tr.setSelection(TextSelection.create(doc, match.from, match.to));
      view.dispatch(tr);
      scrollMatchIntoView(match.from);
    }
    return { current: state.currentIndex + 1, total: state.matches.length };
  });

  const findPrev = useMemoizedFn((): NoteFindResult | null => {
    const state = findStateRef.current;
    if (state.matches.length === 0) return null;
    state.currentIndex =
      state.currentIndex <= 0 ? state.matches.length - 1 : state.currentIndex - 1;
    const match = state.matches[state.currentIndex];
    const view = editor.prosemirrorView;
    const doc = view.state.doc;
    if (match.from <= doc.content.size && match.to <= doc.content.size) {
      const tr = view.state.tr;
      tr.setMeta(searchPluginKey, {
        query: '',
        matches: state.matches,
        activeIndex: state.currentIndex,
      } satisfies SearchExtensionMeta);
      tr.setMeta('addToHistory', false);
      tr.setSelection(TextSelection.create(doc, match.from, match.to));
      view.dispatch(tr);
      scrollMatchIntoView(match.from);
    }
    return { current: state.currentIndex + 1, total: state.matches.length };
  });

  return useMemo(
    () => ({
      focus: () => {
        editor.focus();
      },
      scrollToAnchor,
      exportPdf: async (options) => {
        try {
          setExportDisplayModeOverride(AI_DIFF_DISPLAY_MODE.OLD_ONLY);
          await waitForEditorPaint();
          await printNotePdfViaBrowser(editor, notePluginRegistry, {
            title: options?.title,
            titleRoot: options?.titleRoot,
          });
        } finally {
          setExportDisplayModeOverride(null);
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
      findMatches,
      findNext,
      findPrev,
      clearFind,
    }),
    [
      editor,
      scrollToAnchor,
      setExportDisplayModeOverride,
      findMatches,
      findNext,
      findPrev,
      clearFind,
    ]
  );
}
