import { useChatService, useImageService } from '@/domains';
import { assertImageProxyUploadLimit } from '@/domains/Image';
import { useEffectForce } from '@/hooks/useEffectForce';
import type { AiDiffDisplayMode } from '@/domains/Note';
import { AI_DIFF_DISPLAY_MODE } from '@/domains/Note';
import {
  useChatPanelStore,
  useCurrentChatSessionStore,
  useNewNoteStore,
  useNoteSelectionStore,
} from '@/store';
import type { SelectedNoteScope } from '@/store/useNoteSelectionStore';
import {
  createClientError,
  FRONTEND_CLIENT_ERROR,
  parseErrorMessage,
  WisePenError,
} from '@/utils/error';
import { zh } from '@blocknote/core/locales';
import { BlockNoteView } from '@blocknote/mantine';
import '@blocknote/mantine/style.css';
import { useCreateBlockNote } from '@blocknote/react';
import { toast } from '@heroui/react';
import { useMemoizedFn, useMount, useUnmount, useUpdateEffect } from 'ahooks';
import { useCallback, useImperativeHandle, useMemo, useRef, useState, type Ref } from 'react';
import * as Y from 'yjs';
import NoteSlashMenu from '../NoteSlashMenu';
import NoteToolbar from '../NoteToolbar';
import { hasAiDiffContentFromEditor } from './AiDiffPresence';
import { blockNoteSchema } from './blockNoteSchema';
import { mergeReadOnlyEditorProps, NoteEditorReadOnlyProvider } from './editorReadOnly';
import { useAttachNoteYjsUndoStack, useNoteCaptureKeyEvent, useNoteYjsUndoManager } from './hooks';
import type { CustomBlockNoteProps, NoteBodyEditorHandle } from './index.type';
import type { CustomBlockNoteEditor } from './blockNoteSchema';
import {
  buildFlatBlocksFromEditor,
  buildOutlineItemsFromEditor,
  resolveActiveHeadingId,
} from './Outline';
import {
  collectNoteEditorExtensions,
  collectNoteEditorProps,
  composeNoteBlocksToMarkdownLossy,
  createNoteReadOnlyFilterExtension,
  getNoteEditorPlugins,
} from './plugins';
import {
  aiGeneratedBlocksToBlockNoteBlocks,
  aiProtoBlocksToAiGeneratedBlocks,
  filterDocumentBlocksForAiDiffExport,
  syncAiDiffBlockFoldDisplayMode,
} from './plugins/AIDiffPlugin';
import { AiDiffDisplayModeProvider } from './plugins/AIDiffPlugin/displayModeContext';
import {
  applyAiDiffActionToProps,
  applyAllAiDiffActionsToContent,
  isInlineContentEffectivelyEmpty,
  type AiDiffActionMode,
} from './plugins/AIDiffPlugin/patch';
import aiDiffStyles from './plugins/AIDiffPlugin/style.module.less';
import { printNotePdfViaBrowser, waitForEditorPaint } from './plugins/noteBrowserPrint';
import styles from './style.module.less';

type CreateBlockNoteOptions = NonNullable<Parameters<typeof useCreateBlockNote>[0]>;
type BlockNoteCollaborationConfig = NonNullable<CreateBlockNoteOptions['collaboration']>;

const YJS_ROOT_GROUP_NODE = 'blockGroup';
const YJS_BLOCK_CONTAINER_NODE = 'blockContainer';
const YJS_AI_CONTENT_STORE_MAP = 'ai-content-store';
const YJS_AI_CONTENT_NODE = 'AI-content';

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}

function isYXmlElement(v: unknown): v is Y.XmlElement {
  return v instanceof Y.XmlElement;
}

function isYXmlText(v: unknown): v is Y.XmlText {
  return v instanceof Y.XmlText;
}

function yAttrs(element: Y.XmlElement): Record<string, unknown> {
  return { ...element.getAttributes() };
}

function yTextAttributesToStyles(attributes: Record<string, unknown>): Record<string, string> {
  const styles: Record<string, string> = {};
  for (const [key, value] of Object.entries(attributes)) {
    if (key === 'link') continue;
    if (isRecord(value) && typeof value.stringValue === 'string') {
      styles[key] = value.stringValue;
    } else if (typeof value === 'string') {
      styles[key] = value;
    }
  }
  return styles;
}

function readYTextContent(textNode: Y.XmlText): Record<string, unknown>[] {
  const out: Record<string, unknown>[] = [];
  for (const delta of textNode.toDelta()) {
    if (typeof delta.insert !== 'string' || delta.insert.length === 0) continue;
    const attributes = isRecord(delta.attributes) ? delta.attributes : {};
    const styles = yTextAttributesToStyles(attributes);
    const link = isRecord(attributes.link) ? attributes.link : null;
    if (link) {
      out.push({
        type: 'link',
        href: typeof link.href === 'string' ? link.href : '',
        content: [{ type: 'text', text: delta.insert, styles }],
      });
      continue;
    }
    out.push({ type: 'text', text: delta.insert, styles });
  }
  return out;
}

function readYInlineElement(element: Y.XmlElement): Record<string, unknown> {
  const type = element.nodeName === 'inlineMath' ? 'inlineMath' : element.nodeName;
  return { type, props: yAttrs(element) };
}

function readYInlineContent(element: Y.XmlElement): Record<string, unknown>[] {
  const out: Record<string, unknown>[] = [];
  for (const child of element.toArray()) {
    if (isYXmlText(child)) {
      out.push(...readYTextContent(child));
      continue;
    }
    if (isYXmlElement(child)) {
      if (child.nodeName === YJS_AI_CONTENT_NODE) continue;
      out.push(readYInlineElement(child));
    }
  }
  return out;
}

function readYBlockGroup(
  group: Y.XmlElement,
  aiContentStore: Y.Map<unknown>
): Record<string, unknown>[] {
  const blocks: Record<string, unknown>[] = [];
  for (const child of group.toArray()) {
    if (isYXmlElement(child) && child.nodeName === YJS_BLOCK_CONTAINER_NODE) {
      const block = readYBlockContainer(child, aiContentStore);
      if (block) blocks.push(block);
    }
  }
  return blocks;
}

function readYBlockContainer(
  container: Y.XmlElement,
  aiContentStore: Y.Map<unknown>
): Record<string, unknown> | null {
  const children = container.toArray();
  const blockElement = children.find(
    (child): child is Y.XmlElement =>
      isYXmlElement(child) && child.nodeName !== YJS_ROOT_GROUP_NODE
  );
  if (!blockElement) return null;

  const childGroup = children.find(
    (child): child is Y.XmlElement =>
      isYXmlElement(child) && child.nodeName === YJS_ROOT_GROUP_NODE
  );
  const aiContentElement = blockElement
    .toArray()
    .find(
      (child): child is Y.XmlElement =>
        isYXmlElement(child) && child.nodeName === YJS_AI_CONTENT_NODE
    );
  const blockId = String(container.getAttribute('id') ?? '');
  const storedAiContent = aiContentStore.get(blockId);

  const block: Record<string, unknown> = {
    id: blockId,
    type: blockElement.nodeName,
    props: yAttrs(blockElement),
    content: readYInlineContent(blockElement),
    children: childGroup ? readYBlockGroup(childGroup, aiContentStore) : [],
  };
  if (Array.isArray(storedAiContent)) {
    block[YJS_AI_CONTENT_NODE] = storedAiContent;
  } else if (aiContentElement) {
    block[YJS_AI_CONTENT_NODE] = readYInlineContent(aiContentElement);
  }
  return block;
}

function collectAiContentProtoBlocks(blocks: readonly Record<string, unknown>[]): Record<string, unknown>[] {
  const out: Record<string, unknown>[] = [];
  for (const block of blocks) {
    if (Object.prototype.hasOwnProperty.call(block, YJS_AI_CONTENT_NODE)) {
      out.push(block);
    }
    const children = block.children;
    if (Array.isArray(children)) {
      out.push(...collectAiContentProtoBlocks(children.filter(isRecord)));
    }
  }
  return out;
}

function readAiContentProtoBlocksFromDoc(
  doc: Y.Doc,
  fragment: Y.XmlFragment
): Record<string, unknown>[] {
  const root = fragment
    .toArray()
    .find((child): child is Y.XmlElement => isYXmlElement(child) && child.nodeName === YJS_ROOT_GROUP_NODE);
  if (!root) return [];
  return collectAiContentProtoBlocks(readYBlockGroup(root, doc.getMap(YJS_AI_CONTENT_STORE_MAP)));
}

function findEditorBlockById(blocks: readonly unknown[], id: string): unknown | null {
  for (const block of blocks) {
    if (!isRecord(block)) continue;
    if (block.id === id) return block;
    const children = block.children;
    if (Array.isArray(children)) {
      const found = findEditorBlockById(children, id);
      if (found) return found;
    }
  }
  return null;
}

const EDITOR_AI_DIFF_INLINE_TYPES = new Set([
  'ai-diff',
  'ai-add',
  'ai-delete',
  'ai-link-add',
  'ai-link-delete',
]);

function editorNodeHasAiDiff(node: unknown): boolean {
  if (!isRecord(node)) return false;
  const type = node.type;
  if (typeof type === 'string' && EDITOR_AI_DIFF_INLINE_TYPES.has(type)) return true;

  const props = node.props;
  if (isRecord(props) && typeof props.aiDiffType === 'string') return true;

  const content = node.content;
  if (Array.isArray(content) && content.some(editorNodeHasAiDiff)) return true;

  const children = node.children;
  return Array.isArray(children) && children.some(editorNodeHasAiDiff);
}

function findYBlockContainerById(group: Y.XmlElement, id: string): Y.XmlElement | null {
  for (const child of group.toArray()) {
    if (!isYXmlElement(child) || child.nodeName !== YJS_BLOCK_CONTAINER_NODE) {
      continue;
    }
    if (String(child.getAttribute('id') ?? '') === id) {
      return child;
    }
    const nestedGroup = child
      .toArray()
      .find(
        (grandChild): grandChild is Y.XmlElement =>
          isYXmlElement(grandChild) && grandChild.nodeName === YJS_ROOT_GROUP_NODE
      );
    if (nestedGroup) {
      const nested = findYBlockContainerById(nestedGroup, id);
      if (nested) return nested;
    }
  }
  return null;
}

function removeAiContentFromYBlockContainer(container: Y.XmlElement): boolean {
  const blockElement = container
    .toArray()
    .find(
      (child): child is Y.XmlElement =>
        isYXmlElement(child) && child.nodeName !== YJS_ROOT_GROUP_NODE
    );
  if (!blockElement) return false;

  const aiContentIndex = blockElement
    .toArray()
    .findIndex((child) => isYXmlElement(child) && child.nodeName === YJS_AI_CONTENT_NODE);
  if (aiContentIndex < 0) return false;

  blockElement.delete(aiContentIndex, 1);
  return true;
}

function removeAiContentNodesFromFragment(fragment: Y.XmlFragment, blockIds: ReadonlySet<string>): boolean {
  const root = fragment
    .toArray()
    .find((child): child is Y.XmlElement => isYXmlElement(child) && child.nodeName === YJS_ROOT_GROUP_NODE);
  if (!root) return false;

  let changed = false;
  for (const blockId of blockIds) {
    const container = findYBlockContainerById(root, blockId);
    if (container) {
      changed = removeAiContentFromYBlockContainer(container) || changed;
    }
  }
  return changed;
}

function removeAiContentPayloads(
  doc: Y.Doc,
  fragment: Y.XmlFragment,
  blockIds: ReadonlySet<string>
): boolean {
  const store = doc.getMap(YJS_AI_CONTENT_STORE_MAP);
  let changed = removeAiContentNodesFromFragment(fragment, blockIds);
  for (const blockId of blockIds) {
    if (store.has(blockId)) {
      store.delete(blockId);
      changed = true;
    }
  }
  return changed;
}

function setYAttributes(element: Y.XmlElement, attributes: Record<string, unknown>): void {
  for (const key of Object.keys(element.getAttributes())) {
    if (!Object.prototype.hasOwnProperty.call(attributes, key)) {
      element.removeAttribute(key);
    }
  }

  for (const [key, value] of Object.entries(attributes)) {
    if (value !== undefined) {
      element.setAttribute(key, value as string);
    }
  }
}

function stylesToYTextAttributes(styles: Record<string, unknown>): Record<string, unknown> | undefined {
  const attributes: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(styles)) {
    if (value === undefined || value === false) continue;
    if (value === true) {
      attributes[key] = {};
    } else if (typeof value === 'string') {
      attributes[key] = { stringValue: value };
    } else {
      attributes[key] = value;
    }
  }
  return Object.keys(attributes).length > 0 ? attributes : undefined;
}

function createYTextNode(text: string, styles: Record<string, unknown>): Y.XmlText {
  const textNode = new Y.XmlText();
  textNode.insert(0, text, stylesToYTextAttributes(styles));
  return textNode;
}

function createYInlineNode(item: unknown): Y.XmlElement | Y.XmlText | null {
  if (!isRecord(item)) return null;
  const type = typeof item.type === 'string' ? item.type : '';
  if (!type) return null;

  if (type === 'text') {
    return createYTextNode(
      typeof item.text === 'string' ? item.text : '',
      isRecord(item.styles) ? item.styles : {}
    );
  }

  if (type === 'link') {
    const content = Array.isArray(item.content) ? item.content : [];
    const text = content
      .filter(isRecord)
      .map((child) => (typeof child.text === 'string' ? child.text : ''))
      .join('');
    const firstText = content.find(isRecord);
    const styles = firstText && isRecord(firstText.styles) ? firstText.styles : {};
    const textNode = new Y.XmlText();
    textNode.insert(0, text, {
      ...(stylesToYTextAttributes(styles) ?? {}),
      link: {
        href: typeof item.href === 'string' ? item.href : '',
        target: '_blank',
        rel: 'noopener noreferrer nofollow',
        class: null,
        title: null,
      },
    });
    return textNode;
  }

  const element = new Y.XmlElement(type);
  setYAttributes(element, isRecord(item.props) ? item.props : {});
  return element;
}

function writeMappedBlockToYBlockContainer(
  container: Y.XmlElement,
  mappedBlock: Record<string, unknown>
): boolean {
  const blockElement = container
    .toArray()
    .find(
      (child): child is Y.XmlElement =>
        isYXmlElement(child) && child.nodeName !== YJS_ROOT_GROUP_NODE
    );
  if (!blockElement) return false;

  setYAttributes(blockElement, isRecord(mappedBlock.props) ? mappedBlock.props : {});
  if (blockElement.length > 0) {
    blockElement.delete(0, blockElement.length);
  }

  const content = Array.isArray(mappedBlock.content) ? mappedBlock.content : [];
  const nextChildren = content.map(createYInlineNode).filter((child): child is Y.XmlElement | Y.XmlText => Boolean(child));
  if (nextChildren.length > 0) {
    blockElement.insert(0, nextChildren);
  }
  return true;
}

function writeMappedBlockToYFragment(
  fragment: Y.XmlFragment,
  blockId: string,
  mappedBlock: Record<string, unknown>
): boolean {
  const root = fragment
    .toArray()
    .find((child): child is Y.XmlElement => isYXmlElement(child) && child.nodeName === YJS_ROOT_GROUP_NODE);
  if (!root) return false;

  const container = findYBlockContainerById(root, blockId);
  if (!container) return false;
  return writeMappedBlockToYBlockContainer(container, mappedBlock);
}

function sanitizeMarkdownFileName(fileName?: string): string {
  const normalizedName = (fileName ?? '').trim().replace(/[\\/:*?"<>|]+/g, '_');
  const safeName = normalizedName.replace(/[.\s]+$/g, '');
  return safeName || '未命名笔记';
}

function blockHasNestedChildren(block: { children?: readonly unknown[] }): boolean {
  return Array.isArray(block.children) && block.children.length > 0;
}

function buildSelectedNoteScope(editor: CustomBlockNoteEditor): SelectedNoteScope | null {
  const selectedBlocks = editor.getSelection()?.blocks;
  if (!Array.isArray(selectedBlocks) || selectedBlocks.length === 0) {
    return null;
  }

  const startBlock = selectedBlocks[0];
  const endBlock = selectedBlocks[selectedBlocks.length - 1];
  if (!startBlock?.id || !endBlock?.id) {
    return null;
  }

  return {
    type: 'block_range',
    start_block_id: startBlock.id,
    end_block_id: endBlock.id,
  };
}

function CustomBlockNote({
  resourceId,
  doc,
  provider,
  aiDiffDisplayMode,
  readOnly = false,
  blockLocalDocWrites = false,
  onOutlineChange,
  onActiveHeadingChange,
  onAiDiffPresenceChange,
  ref,
}: CustomBlockNoteProps & { ref?: Ref<NoteBodyEditorHandle> }) {
  const imageService = useImageService();
  const chatService = useChatService();
  const currentSessionId = useCurrentChatSessionStore((state) => state.currentSessionId);
  const setCurrentSession = useCurrentChatSessionStore((state) => state.setCurrentSession);
  const setChatPanelCollapsed = useChatPanelStore((state) => state.setChatPanelCollapsed);
  const setSelectedTextAndScope = useNoteSelectionStore((state) => state.setSelectedTextAndScope);
  const setEnableSelectedText = useNoteSelectionStore((state) => state.setEnableSelectedText);
  const selectedText = useNoteSelectionStore(
    (state) => state.selectedTextByResourceId[resourceId] ?? ''
  );
  const selectedNoteScope = useNoteSelectionStore(
    (state) => state.selectedNoteScopeByResourceId[resourceId]
  );
  const clearSelectedText = useNoteSelectionStore((state) => state.clearSelectedText);
  const newNoteBodyOnChangeCleanupRef = useRef<(() => void) | null>(null);
  const flatBlocksRef = useRef<{ id: string; type: string }[]>([]);
  const [pmWriteGuardReady, setPmWriteGuardReady] = useState(false);
  const effectiveBlockLocalDocWrites = blockLocalDocWrites && pmWriteGuardReady;
  const shouldBlockLocalDocWrites = useMemoizedFn(() => blockLocalDocWrites && pmWriteGuardReady);
  const hasBlockLocalDocWritesProp = useMemoizedFn(() => blockLocalDocWrites);
  const uploadFile = useMemoizedFn(async (file: File) => {
    if (readOnly) {
      const err = new WisePenError({
        code: FRONTEND_CLIENT_ERROR.VALIDATION,
        source: 'client',
        message: '当前笔记为只读，无法上传图片',
      });
      toast.danger(parseErrorMessage(err));
      throw err;
    }
    if (!file.type.startsWith('image/')) {
      throw createClientError(FRONTEND_CLIENT_ERROR.IMAGE_ONLY);
    }
    try {
      assertImageProxyUploadLimit(file);
    } catch (error) {
      toast.danger(parseErrorMessage(error));
      throw error;
    }
    const { publicUrl } = await imageService.uploadImage({
      file,
      scene: 'PRIVATE_IMAGE_FOR_NOTE',
      bizTag: `notes/${resourceId}`,
    });
    return publicUrl;
  });
  const [exportDisplayModeOverride, setExportDisplayModeOverride] =
    useState<AiDiffDisplayMode | null>(null);
  const effectiveAiDiffDisplayMode = exportDisplayModeOverride ?? aiDiffDisplayMode;
  const lastAiDiffPresenceRef = useRef<boolean | null>(null);
  const [hasAiDiffContent, setHasAiDiffContent] = useState(false);
  const { noteFragment, undoManager } = useNoteYjsUndoManager(doc);

  const plugins = useMemo(() => getNoteEditorPlugins(), []);
  const editorExtensions = useMemo(
    () => [
      ...collectNoteEditorExtensions(plugins),
      createNoteReadOnlyFilterExtension(shouldBlockLocalDocWrites),
    ],
    [plugins, shouldBlockLocalDocWrites]
  );
  const editorProps = useMemo(
    () => mergeReadOnlyEditorProps(collectNoteEditorProps(plugins), effectiveBlockLocalDocWrites),
    [plugins, effectiveBlockLocalDocWrites]
  );

  const editor = useCreateBlockNote({
    schema: blockNoteSchema,
    dictionary: zh,
    trailingBlock: true,
    disableExtensions: ['history', 'yUndo'],
    uploadFile,
    extensions: editorExtensions,
    _tiptapOptions: {
      editorProps,
    },
    collaboration: {
      provider: provider as BlockNoteCollaborationConfig['provider'],
      fragment: noteFragment,
      user: {
        name: '',
        color: '#4096ff',
      },
    },
  });

  useMount(() => {
    try {
      syncAiDiffBlockFoldDisplayMode(editor.prosemirrorView, effectiveAiDiffDisplayMode);
    } catch {
      void 0;
    }
  });

  useUpdateEffect(() => {
    try {
      syncAiDiffBlockFoldDisplayMode(editor.prosemirrorView, effectiveAiDiffDisplayMode);
    } catch {
      void 0;
    }
  }, [effectiveAiDiffDisplayMode, editor]);

  useAttachNoteYjsUndoStack(doc, editor, undoManager);

  useUpdateEffect(() => {
    try {
      editor.prosemirrorView.setProps(editorProps);
    } catch {
      void 0;
    }
  }, [editorProps, editor]);

  useMount(() => {
    setSelectedTextAndScope(resourceId, editor.getSelectedText(), buildSelectedNoteScope(editor));
  });

  const syncAiDiffPresence = useCallback(() => {
    const nextHasAiDiffContent = hasAiDiffContentFromEditor(editor);
    if (lastAiDiffPresenceRef.current === nextHasAiDiffContent) {
      return;
    }

    lastAiDiffPresenceRef.current = nextHasAiDiffContent;
    setHasAiDiffContent(nextHasAiDiffContent);
    onAiDiffPresenceChange?.(nextHasAiDiffContent);
  }, [editor, onAiDiffPresenceChange, setHasAiDiffContent]);

  useMount(() => {
    syncAiDiffPresence();
  });

  const normalizeAiContentReviewBlocks = useCallback(() => {
    const protoBlocks = readAiContentProtoBlocksFromDoc(doc, noteFragment);
    if (protoBlocks.length === 0) {
      return;
    }

    const ed = editor as unknown as { document?: unknown[] };

    let changed = false;
    const cleanupOnlyBlockIds = new Set<string>();
    const mappedBlocks = new Map<string, Record<string, unknown>>();
    for (const protoBlock of protoBlocks) {
      const id = typeof protoBlock.id === 'string' ? protoBlock.id : '';
      if (!id) continue;

      const currentBlock = Array.isArray(ed.document) ? findEditorBlockById(ed.document, id) : null;
      if (editorNodeHasAiDiff(currentBlock)) {
        cleanupOnlyBlockIds.add(id);
        continue;
      }

      const generated = aiProtoBlocksToAiGeneratedBlocks([protoBlock]);
      if (!generated) continue;
      const mapped = aiGeneratedBlocksToBlockNoteBlocks(generated);
      if (!Array.isArray(mapped) || !mapped[0]) continue;
      const mappedBlock = mapped[0];
      if (!isRecord(mappedBlock)) continue;
      mappedBlocks.set(id, mappedBlock);
    }

    if (cleanupOnlyBlockIds.size > 0 || mappedBlocks.size > 0) {
      doc.transact(() => {
        if (cleanupOnlyBlockIds.size > 0) {
          changed = removeAiContentPayloads(doc, noteFragment, cleanupOnlyBlockIds) || changed;
        }
        const consumedBlockIds = new Set<string>();
        for (const [id, mappedBlock] of mappedBlocks) {
          if (writeMappedBlockToYFragment(noteFragment, id, mappedBlock)) {
            consumedBlockIds.add(id);
            changed = true;
          }
        }
        if (consumedBlockIds.size > 0) {
          changed = removeAiContentPayloads(doc, noteFragment, consumedBlockIds) || changed;
        }
      });
    }

    if (changed) {
      window.requestAnimationFrame(syncAiDiffPresence);
    }
  }, [doc, editor, noteFragment, syncAiDiffPresence]);

  const aiContentNormalizeQueuedRef = useRef(false);
  useEffectForce(() => {
    const scheduleNormalize = () => {
      if (aiContentNormalizeQueuedRef.current) {
        return;
      }
      aiContentNormalizeQueuedRef.current = true;
      window.requestAnimationFrame(() => {
        aiContentNormalizeQueuedRef.current = false;
        normalizeAiContentReviewBlocks();
      });
    };

    noteFragment.observeDeep(scheduleNormalize);
    scheduleNormalize();
    return () => {
      noteFragment.unobserveDeep(scheduleNormalize);
    };
  }, [noteFragment, normalizeAiContentReviewBlocks]);

  useMount(() => {
    let writeGuardActivated = false;
    const activateWriteGuard = () => {
      if (writeGuardActivated || !hasBlockLocalDocWritesProp()) {
        return;
      }
      writeGuardActivated = true;
      setPmWriteGuardReady(true);
    };

    newNoteBodyOnChangeCleanupRef.current = editor.onChange(() => {
      activateWriteGuard();

      const isNoteEmpty = composeNoteBlocksToMarkdownLossy(editor, plugins).trim().length === 0;
      useNewNoteStore.getState().syncNewNoteBodyFromEditor(resourceId, isNoteEmpty);
      syncAiDiffPresence();

      const needOutline = Boolean(onOutlineChange);
      const needFlatBlocks = Boolean(onActiveHeadingChange);
      if (needOutline || needFlatBlocks) {
        const items = needOutline ? buildOutlineItemsFromEditor(editor) : [];
        const flat = needFlatBlocks ? buildFlatBlocksFromEditor(editor) : [];
        if (needFlatBlocks) {
          flatBlocksRef.current = flat;
        }
        if (needOutline) {
          onOutlineChange?.(items);
        }
      }
    });

    if (hasBlockLocalDocWritesProp()) {
      window.requestAnimationFrame(activateWriteGuard);
    }
  });

  useUpdateEffect(() => {
    if (!blockLocalDocWrites) {
      setPmWriteGuardReady(false);
    }
  }, [blockLocalDocWrites]);

  useUnmount(() => {
    if (newNoteBodyOnChangeCleanupRef.current) {
      newNoteBodyOnChangeCleanupRef.current();
      newNoteBodyOnChangeCleanupRef.current = null;
    }
    clearSelectedText(resourceId);
  });

  useImperativeHandle(
    ref,
    () => ({
      focus: () => {
        editor.focus();
      },
      navigateToBlock: (id: string) => {
        try {
          editor.setTextCursorPosition(id, 'start');
          editor.focus();
          const view = (
            editor as unknown as {
              prosemirrorView?: { state?: { tr?: unknown }; dispatch?: unknown };
            }
          ).prosemirrorView;
          const canScroll =
            typeof view?.dispatch === 'function' &&
            view?.state &&
            isRecord(view.state) &&
            'tr' in view.state &&
            isRecord(view.state.tr) &&
            typeof (view.state.tr as { scrollIntoView?: unknown }).scrollIntoView === 'function';
          if (canScroll) {
            window.requestAnimationFrame(() => {
              try {
                (view.dispatch as (tr: unknown) => void)(
                  (view.state as { tr: { scrollIntoView: () => unknown } }).tr.scrollIntoView()
                );
              } catch {
                void 0;
              }
            });
          }
        } catch {
          editor.focus();
        }
      },
      exportPdf: async (options) => {
        try {
          setExportDisplayModeOverride(AI_DIFF_DISPLAY_MODE.OLD_ONLY);
          syncAiDiffBlockFoldDisplayMode(editor.prosemirrorView, AI_DIFF_DISPLAY_MODE.OLD_ONLY);
          await waitForEditorPaint();
          await printNotePdfViaBrowser(editor, {
            title: options?.title,
            titleRoot: options?.titleRoot,
          });
        } finally {
          setExportDisplayModeOverride(null);
          try {
            syncAiDiffBlockFoldDisplayMode(editor.prosemirrorView, aiDiffDisplayMode);
          } catch {
            void 0;
          }
        }
      },
      downloadMarkdown: async (fileName?: string) => {
        const blocksForExport = filterDocumentBlocksForAiDiffExport(
          editor.document,
          AI_DIFF_DISPLAY_MODE.OLD_ONLY
        );
        const markdown = composeNoteBlocksToMarkdownLossy(
          editor,
          plugins,
          blocksForExport as typeof editor.document
        );
        const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');

        anchor.href = url;
        anchor.download = `${sanitizeMarkdownFileName(fileName)}.md`;
        anchor.style.display = 'none';
        document.body.appendChild(anchor);
        anchor.click();
        document.body.removeChild(anchor);
        URL.revokeObjectURL(url);
      },
    }),
    [aiDiffDisplayMode, editor, plugins]
  );

  const onKeyDownCapture = useNoteCaptureKeyEvent({ provider, undoManager, readOnly });

  const handleSelectionChange = () => {
    setSelectedTextAndScope(resourceId, editor.getSelectedText(), buildSelectedNoteScope(editor));
    if (!onActiveHeadingChange) {
      return;
    }
    let activeId: string | undefined;
    try {
      const cursor = editor.getTextCursorPosition();
      const currentId = cursor.block?.id;
      if (!currentId) {
        onActiveHeadingChange(undefined);
        return;
      }
      activeId = resolveActiveHeadingId(flatBlocksRef.current, currentId);
    } catch {
      activeId = undefined;
    }
    onActiveHeadingChange(activeId);
  };

  const handleAskAi = async () => {
    let targetSessionId = currentSessionId;
    const selectedSnapshot = editor.getSelectedText().trim() || selectedText.trim();
    const selectedScopeSnapshot = buildSelectedNoteScope(editor) ?? selectedNoteScope ?? null;
    if (!selectedSnapshot) {
      toast.info('请先选中一段文字再问 AI');
      return;
    }

    if (!targetSessionId) {
      try {
        const createdSession = await chatService.createSession();
        targetSessionId = createdSession.id;
        setCurrentSession({ id: createdSession.id, title: createdSession.title });
      } catch (error) {
        const text = error instanceof Error ? error.message : '新建聊天失败';
        toast.danger(text);
        return;
      }
    }

    setSelectedTextAndScope(targetSessionId, selectedSnapshot, selectedScopeSnapshot);
    setEnableSelectedText(targetSessionId, true);
    setChatPanelCollapsed(false);
  };

  const applyAllAiDiffActions = useCallback(
    (mode: AiDiffActionMode) => {
      if (readOnly) {
        return;
      }

      const blocks: Parameters<Parameters<typeof editor.forEachBlock>[0]>[0][] = [];
      editor.forEachBlock((block) => {
        blocks.push(block);
        return true;
      });

      const updates: Array<{
        block: (typeof blocks)[number];
        update: Parameters<typeof editor.updateBlock>[1];
      }> = [];
      const blocksToRemove: Parameters<typeof editor.removeBlocks>[0] = [];

      for (const block of blocks) {
        const propsAction = applyAiDiffActionToProps(block.props, mode);
        const nextContent = applyAllAiDiffActionsToContent(block.content, mode);

        if (propsAction.kind === 'remove') {
          blocksToRemove.push(block);
          continue;
        }

        if (nextContent && isInlineContentEffectivelyEmpty(nextContent)) {
          if (!blockHasNestedChildren(block)) {
            blocksToRemove.push(block);
            continue;
          }
        }

        if (!nextContent && propsAction.kind !== 'update') {
          continue;
        }

        updates.push({
          block,
          update: {
            ...(nextContent ? { content: nextContent } : {}),
            ...(propsAction.kind === 'update' ? { props: propsAction.props } : {}),
          } as Parameters<typeof editor.updateBlock>[1],
        });
      }

      for (const item of updates) {
        try {
          editor.updateBlock(item.block, item.update);
        } catch {
          void 0;
        }
      }

      for (let i = blocksToRemove.length - 1; i >= 0; i -= 1) {
        try {
          const block = blocksToRemove[i];
          if (block) {
            editor.removeBlocks([block]);
          }
        } catch {
          void 0;
        }
      }

      editor.focus();
      syncAiDiffPresence();
    },
    [editor, readOnly, syncAiDiffPresence]
  );
  const showAiBulkActions =
    hasAiDiffContent && !readOnly && aiDiffDisplayMode === AI_DIFF_DISPLAY_MODE.COMPARE;

  return (
    <div className={styles.editorShell} onKeyDownCapture={onKeyDownCapture}>
      {showAiBulkActions ? (
        <div className={styles.aiBulkActions} contentEditable={false}>
          <button
            type="button"
            aria-label="Keep all AI changes"
            className={`${aiDiffStyles.aiActionBtn} ${aiDiffStyles.aiActionAccept} ${styles.aiBulkActionBtn}`}
            onMouseDown={(event) => {
              event.preventDefault();
              event.stopPropagation();
            }}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              applyAllAiDiffActions('accept');
            }}
          >
            Keep all
          </button>
          <button
            type="button"
            aria-label="Undo all AI changes"
            className={`${aiDiffStyles.aiActionBtn} ${aiDiffStyles.aiActionDiscard} ${styles.aiBulkActionBtn}`}
            onMouseDown={(event) => {
              event.preventDefault();
              event.stopPropagation();
            }}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              applyAllAiDiffActions('discard');
            }}
          >
            Undo all
          </button>
        </div>
      ) : null}
      <NoteEditorReadOnlyProvider value={readOnly}>
        <AiDiffDisplayModeProvider value={effectiveAiDiffDisplayMode}>
          <BlockNoteView
            editor={editor}
            theme="light"
            formattingToolbar={false}
            slashMenu={false}
            editable={!readOnly}
            onSelectionChange={handleSelectionChange}
          >
            <NoteToolbar onAskAi={handleAskAi} />
            <NoteSlashMenu editor={editor} plugins={plugins} />
          </BlockNoteView>
        </AiDiffDisplayModeProvider>
      </NoteEditorReadOnlyProvider>
    </div>
  );
}

CustomBlockNote.displayName = 'CustomBlockNote';

export default CustomBlockNote;
