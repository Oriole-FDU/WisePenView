import { createAiDiffEditorExtension } from '../engines/aiDiff/extension';
import { searchEditorExtension } from '../engines/search/extension';
import { codeBlockPlugin } from '../plugins/CodeBlockPlugin';
import { createDefaultContentPlugin } from '../plugins/DefaultContentPlugin';
import { createHighlightBlockPlugin } from '../plugins/HighlightBlockPlugin';
import { latexPlugin } from '../plugins/LatexPlugin';
import { mermaidPlugin } from '../plugins/MermaidPlugin';
import { tablePlugin } from '../plugins/TablePlugin';
import {
  collectNoteEditorExtensions,
  collectNoteEditorProps,
  createDefaultNoteBlock,
  createNoteBlockNoteSchema,
  createNotePluginRegistry,
} from './index';
import { noteConfig } from './noteConfig';
import { createNoteTransactionService } from './transactionService';
import type { NoteEditorServices, NotePluginBundle } from './types';

const richTextAiDiffConfig = noteConfig.aiDiff.richText;
const defaultContentPlugin = createDefaultContentPlugin(richTextAiDiffConfig);
const highlightBlockPlugin = createHighlightBlockPlugin(richTextAiDiffConfig);
const aiDiffEditorExtension = createAiDiffEditorExtension(richTextAiDiffConfig);

const notePluginTree = {
  kind: 'bundle',
  id: 'note',
  children: [
    defaultContentPlugin,
    highlightBlockPlugin,
    codeBlockPlugin,
    tablePlugin,
    latexPlugin,
    mermaidPlugin,
  ],
} satisfies NotePluginBundle;

const noteEditorServices = {
  transactions: createNoteTransactionService(),
} satisfies NoteEditorServices;

export const notePluginRegistry = createNotePluginRegistry({
  root: notePluginTree,
  editorExtensions: [aiDiffEditorExtension, searchEditorExtension],
  services: noteEditorServices,
});

/** 笔记正文 schema 由唯一的内容插件树生成。 */
export const blockNoteSchema = createNoteBlockNoteSchema(notePluginRegistry);

/** 带所有内容 owner 的编辑器类型。 */
export type CustomBlockNoteEditor = typeof blockNoteSchema.BlockNoteEditor;

export { collectNoteEditorExtensions, collectNoteEditorProps, createDefaultNoteBlock };
