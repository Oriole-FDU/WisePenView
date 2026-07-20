import { aiDiffEditorExtension } from './engines/aiDiff/extension';
import { stripEscapeEditorExtension } from './engines/editor/stripEscape';
import { searchEditorExtension } from './engines/search/extension';
import { noteConfig } from './noteConfig';
import { codeBlockPlugin } from './plugins/CodeBlockPlugin';
import { createDefaultContentPlugin } from './plugins/DefaultContentPlugin';
import { latexPlugin } from './plugins/LatexPlugin';
import { tablePlugin } from './plugins/TablePlugin';
import {
  collectNoteEditorExtensions,
  collectNoteEditorProps,
  createDefaultNoteBlock,
  createNoteBlockNoteSchema,
  createNotePluginRegistry,
} from './registry';
import type { NotePluginBundle } from './registry/types';

const defaultContentPlugin = createDefaultContentPlugin(noteConfig.aiDiff.richText);

const notePluginTree = {
  kind: 'bundle',
  id: 'note',
  children: [defaultContentPlugin, codeBlockPlugin, tablePlugin, latexPlugin],
} satisfies NotePluginBundle;

export const notePluginRegistry = createNotePluginRegistry(notePluginTree, [
  stripEscapeEditorExtension,
  aiDiffEditorExtension,
  searchEditorExtension,
]);

/** 笔记正文 schema 由唯一的内容插件树生成。 */
export const blockNoteSchema = createNoteBlockNoteSchema(notePluginRegistry);

/** 带所有内容 owner 的编辑器类型。 */
export type CustomBlockNoteEditor = typeof blockNoteSchema.BlockNoteEditor;

export { collectNoteEditorExtensions, collectNoteEditorProps, createDefaultNoteBlock };
