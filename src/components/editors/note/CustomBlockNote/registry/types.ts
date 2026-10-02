import type {
  BlockNoteEditor,
  BlockSchema,
  BlockSpecs,
  ExtensionFactoryInstance,
  InlineContentConfig,
  InlineContentSchema,
  InlineContentSpec,
  StyleSchema,
} from '@blocknote/core';
import type { DefaultReactSuggestionItem } from '@blocknote/react';
import type { Node as PMNode } from '@tiptap/pm/model';
import type { Transaction } from '@tiptap/pm/state';
import type { EditorProps } from '@tiptap/pm/view';
import type { LucideIcon } from 'lucide-react';

import type { AiDiffDisplayMode } from '@/domains/Note';

export type NoteInlineContentSpecs = Record<string, InlineContentSpec<InlineContentConfig>>;

export type PluginEditor = BlockNoteEditor<BlockSchema, InlineContentSchema, StyleSchema>;

export interface NoteTransactionRange {
  from: number;
  to: number;
}

export interface NoteChangedBlock {
  id: string;
  node: PMNode;
  pos: number;
}

export interface NoteTransactionAnalysis {
  docChanged: boolean;
  changedRanges: readonly NoteTransactionRange[];
  changedBlocks: readonly NoteChangedBlock[];
  removedBlockIds: readonly string[];
  structureChanged: boolean;
}

export interface NoteTransactionUpdate {
  transaction: Transaction;
  appendedTransactions: Transaction[];
}

export interface NoteTransactionEditor {
  _tiptapEditor: {
    on: (event: 'update', listener: (update: NoteTransactionUpdate) => void) => void;
    off: (event: 'update', listener: (update: NoteTransactionUpdate) => void) => void;
  };
}

export interface NoteTransactionService {
  analyze: (transactions: readonly Transaction[]) => NoteTransactionAnalysis;
  subscribe: (
    editor: NoteTransactionEditor,
    listener: (analysis: NoteTransactionAnalysis) => void
  ) => () => void;
}

export interface NoteEditorServices {
  transactions: NoteTransactionService;
}

export type NoteCapabilityDeclaration =
  | { support: 'default' }
  | { support: 'custom' }
  | { support: 'inherited' }
  | { support: 'unsupported'; reason: string };

export interface NoteContentCapabilityDeclarations {
  markdownImport: NoteCapabilityDeclaration;
  markdownExport: NoteCapabilityDeclaration;
  aiDiff: NoteCapabilityDeclaration;
  plainText: NoteCapabilityDeclaration;
  findReplace: NoteCapabilityDeclaration;
  print: NoteCapabilityDeclaration;
}

export type NoteFindReplaceHighlight =
  { kind: 'inline'; from: number; to: number } | { kind: 'node'; from: number; to: number };

/** 插件产出的纯替换描述，由搜索协调器统一写入同一个事务。 */
export type NoteReplaceOperation =
  | { kind: 'inlineText'; from: number; to: number }
  | {
      kind: 'nodeAttributeText';
      pos: number;
      attribute: string;
      fromOffset: number;
      toOffset: number;
    };

export interface NoteFindReplaceMatch {
  pluginId: string;
  /** 用于排序、定位和与当前选区比对的稳定文档位置。 */
  from: number;
  to: number;
  highlight: NoteFindReplaceHighlight;
  operation: NoteReplaceOperation;
}

export interface NoteFindReplaceContext {
  node: PMNode;
  pos: number;
  query: string;
  registry: NotePluginRegistry;
}

export interface NoteFindReplaceFacet {
  collectMatches: (context: NoteFindReplaceContext) => readonly NoteFindReplaceMatch[];
}

interface NoteBlockPlainTextFacet {
  project: (block: Record<string, unknown>, registry: NotePluginRegistry) => string;
}

export interface NoteBlockOutlineFacet {
  getLevel: (block: Record<string, unknown>) => number | undefined;
}

interface NoteInlinePlainTextFacet {
  project: (inline: Record<string, unknown>, registry: NotePluginRegistry) => string;
}

interface NoteMarkdownExportContext {
  aiDiffDisplayMode: AiDiffDisplayMode;
}

export interface NoteSelectionContext {
  selected: boolean;
  selectedText: string;
}

export interface NoteSelectionFacet {
  inspect: (
    content: Record<string, unknown>,
    context: NoteSelectionContext
  ) => { selected: boolean; text: string };
}

interface NoteMarkdownExportProjection {
  project: (
    node: Record<string, unknown>,
    context: NoteMarkdownExportContext
  ) => Record<string, unknown> | null;
  /** 仅用于 BlockNote 默认 serializer 无法保真的叶子 block。 */
  renderMarkdown?: (node: Record<string, unknown>, context: NoteMarkdownExportContext) => string;
}

export type NoteAiDiffAction = 'accept' | 'discard';

export type NoteAiDiffActionTarget =
  { kind: 'inline-hunk'; index: number } | { kind: 'content-hunk' };

export interface NoteAiDiffComparisonContext {
  /** 为每个可确认 hunk 挂上选中态 / 工具条 */
  decorateHunk?: (element: HTMLElement, target: NoteAiDiffActionTarget) => void;
}

export interface NoteAiDiffProjection {
  current: Record<string, unknown>;
  aiBlock: Record<string, unknown>;
  currentEmpty: boolean;
  aiContentEmpty: boolean;
  changeKind: 'create' | 'update' | 'delete';
}

export interface NoteAiDiffAcceptedBlockUpdate {
  props?: Record<string, unknown>;
  content?: unknown;
}

export interface NoteInlineAiDiff {
  renderAiContent: (
    aiContent: Record<string, unknown>,
    registry: NotePluginRegistry
  ) => HTMLElement;
}

export interface NotePrintContribution {
  styles: readonly string[];
}

export interface NoteBlockAiDiff {
  resolve?: (
    block: Record<string, unknown>,
    aiContent: unknown,
    registry: NotePluginRegistry
  ) => NoteAiDiffProjection | null;
  acceptAiContent?: (
    block: Record<string, unknown>,
    aiContent: unknown,
    registry: NotePluginRegistry
  ) => NoteAiDiffAcceptedBlockUpdate | null;
  renderAiContent: (aiBlock: Record<string, unknown>, registry: NotePluginRegistry) => HTMLElement;
  comparison?: {
    render: (
      current: Record<string, unknown>,
      aiBlock: Record<string, unknown>,
      registry: NotePluginRegistry,
      context?: NoteAiDiffComparisonContext
    ) => HTMLElement;
  };
  applyGranular?: (
    block: Record<string, unknown>,
    aiContent: unknown,
    action: NoteAiDiffAction,
    target: NoteAiDiffActionTarget,
    registry: NotePluginRegistry
  ) => unknown | null;
}

export type NoteMarkdownImportSegment =
  { type: 'text'; text: string } | { type: 'token'; value: string };

export interface NoteMarkdownImportContext {
  createToken: (value: string) => string;
  readExactToken: (text: string) => string | undefined;
  splitTokens: (text: string) => NoteMarkdownImportSegment[];
}

export interface NoteMarkdownBlockImport {
  prepare?: (markdown: string, context: NoteMarkdownImportContext) => string;
  restore: (
    block: Record<string, unknown>,
    context: NoteMarkdownImportContext
  ) => Record<string, unknown> | undefined;
}

export interface NoteMarkdownInlineImport {
  prepare?: (markdown: string, context: NoteMarkdownImportContext) => string;
  restore: (
    inline: Record<string, unknown>,
    context: NoteMarkdownImportContext
  ) => readonly Record<string, unknown>[] | undefined;
}

export interface NoteSideMenuAction {
  id: string;
  label: string;
  icon: LucideIcon;
  kind: 'command' | 'toggle';
  selected?: boolean;
}

interface NoteSideMenuState {
  variant?: 'standard' | 'structured';
  attributes?: Readonly<Record<string, string | undefined>>;
  actions?: readonly NoteSideMenuAction[];
}

interface NoteBlockSideMenu {
  icon?: LucideIcon;
  inspect?: (block: Record<string, unknown>) => NoteSideMenuState;
  apply?: (
    block: Record<string, unknown>,
    actionId: string
  ) => { type?: string; props?: Record<string, unknown>; content?: unknown } | null;
}

type NoteBlockContentModel = 'inline' | 'table' | 'none';

interface NoteBlockInsertion {
  default?: boolean;
  createEmpty: () => Record<string, unknown>;
}

interface NoteBlockInputRules {
  inlineMathDollar?: boolean;
}

interface NotePluginNodeBase {
  id: string;
  dependencies?: readonly string[];
}

interface NoteContentPluginBase extends NotePluginNodeBase {
  type: string;
  capabilities: NoteContentCapabilityDeclarations;
  print?: NotePrintContribution;
  extensions?: (context: NotePluginContext) => ExtensionFactoryInstance[];
  editorProps?: (context: NotePluginContext) => Partial<EditorProps>;
  slashMenu?: (ctx: { editor: PluginEditor }) => DefaultReactSuggestionItem[];
  selection: NoteSelectionFacet;
}

export interface NoteBlockPlugin extends NoteContentPluginBase {
  kind: 'block';
  spec: BlockSpecs[string];
  contentModel: NoteBlockContentModel;
  insertion?: NoteBlockInsertion;
  inputRules?: NoteBlockInputRules;
  plainText?: NoteBlockPlainTextFacet;
  findReplace?: NoteFindReplaceFacet;
  outline?: NoteBlockOutlineFacet;
  markdownImport?: NoteMarkdownBlockImport;
  markdownExport?: NoteMarkdownExportProjection;
  aiDiff?: NoteBlockAiDiff;
  sideMenu?: NoteBlockSideMenu;
}

export interface NoteInlinePlugin extends NoteContentPluginBase {
  kind: 'inline';
  spec: InlineContentSpec<InlineContentConfig>;
  plainText?: NoteInlinePlainTextFacet;
  findReplace?: NoteFindReplaceFacet;
  markdownImport?: NoteMarkdownInlineImport;
  markdownExport?: NoteMarkdownExportProjection;
  aiDiff: NoteInlineAiDiff;
}

export interface NotePluginBundle extends NotePluginNodeBase {
  kind: 'bundle';
  children: readonly NotePluginNode[];
}

export type NoteContentPlugin = NoteBlockPlugin | NoteInlinePlugin;
export type NotePluginNode = NotePluginBundle | NoteContentPlugin;

export interface NoteEditorExtension extends NotePluginNodeBase {
  print?: NotePrintContribution;
  extensions?: (context: NotePluginContext) => ExtensionFactoryInstance[];
  editorProps?: (context: NotePluginContext) => Partial<EditorProps>;
}

interface NotePluginContext {
  registry: NotePluginRegistry;
  services: NoteEditorServices;
}

export interface NotePluginRegistry {
  root: NotePluginBundle;
  services: NoteEditorServices;
  contentPlugins: readonly NoteContentPlugin[];
  blockPlugins: ReadonlyMap<string, NoteBlockPlugin>;
  inlinePlugins: ReadonlyMap<string, NoteInlinePlugin>;
  defaultBlock?: NoteBlockInsertion;
  editorExtensions: readonly NoteEditorExtension[];
}
