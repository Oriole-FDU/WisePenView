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
            if (tr.docChanged && previous.matches.length > 0) {
              const decorations = buildSearchDecorations(
                newState.doc as unknown as PMNode,
                previous.matches,
                previous.activeIndex
              );
              return { ...previous, decorations };
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
