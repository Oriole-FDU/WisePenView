import './style.module.less';

import { createExtension } from '@blocknote/core';
import type { Node as PMNode } from '@tiptap/pm/model';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';

import type {
  NoteEditorExtension,
  NoteFindReplaceMatch,
  NotePluginRegistry,
} from '../../registry/types';
import { collectFindReplaceMatches } from './findReplace';

interface SearchState {
  query: string;
  matches: NoteFindReplaceMatch[];
  activeIndex: number;
}

export interface SearchExtensionState extends SearchState {
  decorations: DecorationSet;
}

export type SearchExtensionMeta = SearchState;

export const searchPluginKey = new PluginKey<SearchExtensionState>('noteTextSearch');

export function findActiveSearchMatchElement(root: ParentNode): HTMLElement | null {
  return root.querySelector<HTMLElement>('[data-search-match="active"]');
}

/** 优先命中包含当前文档位置的结果，未命中时回退第一项。 */
export function getSearchMatchIndexAtPosition(
  matches: readonly NoteFindReplaceMatch[],
  position: number
): number {
  const index = matches.findIndex((match) => match.from <= position && position < match.to);
  return index === -1 ? 0 : index;
}

function clampActiveIndex(activeIndex: number, matchCount: number): number {
  if (matchCount === 0) return -1;
  if (activeIndex < 0) return 0;
  if (activeIndex >= matchCount) return matchCount - 1;
  return activeIndex;
}

function buildSearchDecorations(
  doc: PMNode,
  matches: readonly NoteFindReplaceMatch[],
  activeIndex: number
): DecorationSet {
  if (matches.length === 0) return DecorationSet.empty;

  const decorations = matches.map((match, index) => {
    const isActive = index === activeIndex;
    const attributes = {
      class: isActive
        ? 'wise-search-highlight wise-search-highlight-active'
        : 'wise-search-highlight',
      'data-search-match': isActive ? 'active' : 'true',
    };
    return match.highlight.kind === 'node'
      ? Decoration.node(match.highlight.from, match.highlight.to, attributes)
      : Decoration.inline(match.highlight.from, match.highlight.to, attributes);
  });

  return DecorationSet.create(doc, decorations);
}

function createSearchExtension(registry: NotePluginRegistry) {
  return createExtension({
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
                const matches = collectFindReplaceMatches(doc, previous.query, registry);
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
}

export const searchEditorExtension = {
  id: 'search.extension',
  extensions: ({ registry }) => [createSearchExtension(registry)],
} satisfies NoteEditorExtension;
