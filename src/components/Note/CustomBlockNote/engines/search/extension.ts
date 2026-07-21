import { createExtension } from '@blocknote/core';
import type { Node as PMNode } from '@tiptap/pm/model';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';

import type { NoteEditorExtension } from '../../registry/types';
import './style.module.less';

interface SearchMatch {
  from: number;
  to: number;
}

export interface SearchExtensionState {
  query: string;
  decorations: DecorationSet;
  matches: SearchMatch[];
  activeIndex: number;
}

export interface SearchExtensionMeta {
  query: string;
  matches: SearchMatch[];
  activeIndex: number;
}

export const searchPluginKey = new PluginKey<SearchExtensionState>('noteTextSearch');

/** 在文档中收集大小写不敏感的全文匹配区间 */
export function collectSearchMatches(doc: PMNode, query: string): SearchMatch[] {
  const trimmedQuery = query.trim();
  if (!trimmedQuery) return [];

  const lowerQuery = trimmedQuery.toLowerCase();
  const matches: SearchMatch[] = [];
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
  return matches;
}

function clampActiveIndex(activeIndex: number, matchCount: number): number {
  if (matchCount === 0) return -1;
  if (activeIndex < 0) return 0;
  if (activeIndex >= matchCount) return matchCount - 1;
  return activeIndex;
}

function buildSearchDecorations(
  doc: PMNode,
  matches: SearchMatch[],
  activeIndex: number
): DecorationSet {
  if (matches.length === 0) return DecorationSet.empty;

  const decorations = matches.map((match, index) => {
    const isActive = index === activeIndex;
    return Decoration.inline(match.from, match.to, {
      class: isActive
        ? 'wise-search-highlight wise-search-highlight-active'
        : 'wise-search-highlight',
      'data-search-match': isActive ? 'active' : 'true',
    });
  });

  return DecorationSet.create(doc, decorations);
}

const searchExtension = createExtension({
  key: 'noteTextSearch',
  prosemirrorPlugins: [
    new Plugin<SearchExtensionState>({
      key: searchPluginKey,
      state: {
        init: () => ({
          query: '',
          decorations: DecorationSet.empty,
          matches: [],
          activeIndex: -1,
        }),
        apply: (tr, previous, _oldState, newState) => {
          const meta: SearchExtensionMeta | undefined = tr.getMeta(searchPluginKey);
          if (!meta) {
            if (tr.docChanged && previous.query.trim().length > 0) {
              const doc = newState.doc as unknown as PMNode;
              const matches = collectSearchMatches(doc, previous.query);
              const activeIndex = clampActiveIndex(previous.activeIndex, matches.length);
              return {
                query: previous.query,
                matches,
                activeIndex,
                decorations: buildSearchDecorations(doc, matches, activeIndex),
              };
            }
            return previous;
          }
          const decorations = buildSearchDecorations(
            newState.doc as unknown as PMNode,
            meta.matches,
            meta.activeIndex
          );
          return {
            query: meta.query,
            decorations,
            matches: meta.matches,
            activeIndex: meta.activeIndex,
          };
        },
      },
      props: {
        decorations: (state) => searchPluginKey.getState(state)?.decorations ?? null,
      },
    }),
  ],
});

export const searchEditorExtension = {
  id: 'search.extension',
  extensions: () => [searchExtension],
} satisfies NoteEditorExtension;
