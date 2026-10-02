import type { Node as PMNode } from '@tiptap/pm/model';
import {
  absolutePositionToRelativePosition,
  type ProsemirrorBinding,
  relativePositionToAbsolutePosition,
  ySyncPluginKey,
} from 'y-prosemirror';
import type { XmlFragment } from 'yjs';
import * as Y from 'yjs';

import type { NoteInlineCommentAnchor, NoteInlineCommentDraft } from '@/domains/Note';

import type { CustomBlockNoteEditor } from '../../registry/noteEditorComposition';
import type { NotePluginRegistry } from '../../registry/types';
import { getRootDomSelection } from '../editor/dom';

interface SelectedRange {
  from: number;
  to: number;
}

function encodeBytes(bytes: Uint8Array): string {
  let binary = '';
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return window.btoa(binary);
}

function decodeBytes(value: string): Uint8Array {
  const binary = window.atob(value);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function encodeRelativePosition(position: Y.RelativePosition): string {
  return encodeBytes(Y.encodeRelativePosition(position));
}

function createLeftAssociatedRelativePosition(
  position: number,
  binding: ProsemirrorBinding
): Y.RelativePosition {
  const previousPosition = absolutePositionToRelativePosition(
    position - 1,
    binding.type,
    binding.mapping
  );
  // y-prosemirror 未暴露 assoc：关联到结束点左侧内容，避免边界后插入的文字扩展批注。
  return new Y.RelativePosition(
    previousPosition.type,
    previousPosition.tname,
    previousPosition.item,
    -1
  );
}

function readBinding(editor: CustomBlockNoteEditor): ProsemirrorBinding | null {
  const syncState = ySyncPluginKey.getState(editor.prosemirrorState) as
    { binding?: ProsemirrorBinding } | undefined;
  return syncState?.binding ?? null;
}

function getDomElement(node: Node): Element | null {
  return node.nodeType === Node.ELEMENT_NODE ? (node as Element) : node.parentElement;
}

function findSelectedPluginNodeRange(
  editor: CustomBlockNoteEditor,
  registry: NotePluginRegistry,
  node: Node
): SelectedRange | null {
  const element = getDomElement(node)?.closest<HTMLElement>(
    '[data-inline-content-type], [data-content-type]'
  );
  if (!element) return null;
  const type = element.dataset.inlineContentType ?? element.dataset.contentType;
  if (!type) return null;
  const owner = registry.inlinePlugins.get(type) ?? registry.blockPlugins.get(type);
  if (!owner) return null;
  const view = editor.prosemirrorView;
  const positions = [
    () => view.posAtDOM(element, 0, -1),
    () => view.posAtDOM(element, 0, 1),
    () => view.posAtDOM(element, element.childNodes.length, 1),
    () => view.posAtDOM(element, element.childNodes.length, -1),
  ];
  for (const readPosition of positions) {
    try {
      const position = readPosition();
      const nodeAtPosition = view.state.doc.nodeAt(position);
      if (nodeAtPosition?.type.name === type) {
        return { from: position, to: position + nodeAtPosition.nodeSize };
      }
      const $position = view.state.doc.resolve(position);
      for (let depth = $position.depth; depth > 0; depth -= 1) {
        const pluginNode = $position.node(depth);
        if (pluginNode.type.name !== type) continue;
        const from = $position.before(depth);
        return { from, to: from + pluginNode.nodeSize };
      }
    } catch {
      continue;
    }
  }
  return null;
}

function readDomSelectedRange(
  editor: CustomBlockNoteEditor,
  registry: NotePluginRegistry
): SelectedRange | null {
  const view = editor.prosemirrorView;
  const selection = getRootDomSelection(view.root);
  if (!selection || selection.isCollapsed || selection.rangeCount === 0) return null;
  const range = selection.getRangeAt(0);
  const startElement = getDomElement(range.startContainer);
  const endElement = getDomElement(range.endContainer);
  if (!startElement || !endElement) return null;
  if (!view.dom.contains(startElement) || !view.dom.contains(endElement)) return null;

  try {
    const start = view.posAtDOM(range.startContainer, range.startOffset, 1);
    const end = view.posAtDOM(range.endContainer, range.endOffset, -1);
    const from = Math.min(start, end);
    const to = Math.max(start, end);
    if (from !== to) return { from, to };
  } catch {
    // 公式 NodeView 内部 DOM 不一定能直接映射，下面回退到公式节点边界。
  }

  return (
    findSelectedPluginNodeRange(editor, registry, range.commonAncestorContainer) ??
    findSelectedPluginNodeRange(editor, registry, range.startContainer) ??
    findSelectedPluginNodeRange(editor, registry, range.endContainer)
  );
}

function readSelectedRange(
  editor: CustomBlockNoteEditor,
  registry: NotePluginRegistry
): SelectedRange | null {
  const selection = editor.prosemirrorState.selection;
  if (!selection.empty && selection.from !== selection.to) {
    return { from: selection.from, to: selection.to };
  }
  return readDomSelectedRange(editor, registry);
}

function projectSelectedText(
  editor: CustomBlockNoteEditor,
  registry: NotePluginRegistry,
  range: SelectedRange
): string {
  const selectedText = projectInlineCommentRangeText(editor.prosemirrorState.doc, registry, range);
  const selectedBlocks = editor.getSelection()?.blocks ?? [];
  if (selectedBlocks.length !== 1) return selectedText;
  const block = selectedBlocks[0] as unknown as Record<string, unknown> & { type?: string };
  const owner = block.type ? registry.blockPlugins.get(block.type) : undefined;
  const pluginSelection = owner?.selection.inspect(block, { selected: true, selectedText });
  return pluginSelection?.selected ? pluginSelection.text : selectedText;
}

export function projectInlineCommentRangeText(
  doc: PMNode,
  registry: NotePluginRegistry,
  range: SelectedRange
): string {
  return doc.textBetween(range.from, range.to, '\n', (leafNode) => {
    const owner =
      registry.inlinePlugins.get(leafNode.type.name) ??
      registry.blockPlugins.get(leafNode.type.name);
    if (!owner) return '';
    const pluginSelection = owner.selection.inspect(
      { type: leafNode.type.name, props: leafNode.attrs },
      { selected: true, selectedText: '' }
    );
    return pluginSelection.selected ? pluginSelection.text : '';
  });
}

export function captureInlineCommentDraft(
  editor: CustomBlockNoteEditor,
  registry: NotePluginRegistry
): NoteInlineCommentDraft | null {
  const range = readSelectedRange(editor, registry);
  if (!range) return null;
  const binding = readBinding(editor);
  if (!binding) return null;
  const quoteText = projectSelectedText(editor, registry, range);
  if (!quoteText.trim()) return null;

  return {
    anchor: {
      start: encodeRelativePosition(
        absolutePositionToRelativePosition(range.from, binding.type, binding.mapping)
      ),
      end: encodeRelativePosition(createLeftAssociatedRelativePosition(range.to, binding)),
    },
    quoteText,
  };
}

export function resolveInlineCommentAnchor(params: {
  anchor: NoteInlineCommentAnchor;
  fragment: XmlFragment;
  binding: ProsemirrorBinding;
}): { from: number; to: number; fromAssoc: -1 | 1; toAssoc: -1 | 1 } | null {
  const { anchor, fragment, binding } = params;
  const doc = fragment.doc;
  if (!doc) return null;
  try {
    const relativeStart = Y.decodeRelativePosition(decodeBytes(anchor.start));
    const relativeEnd = Y.decodeRelativePosition(decodeBytes(anchor.end));
    const start = relativePositionToAbsolutePosition(doc, fragment, relativeStart, binding.mapping);
    const end = relativePositionToAbsolutePosition(doc, fragment, relativeEnd, binding.mapping);
    if (start === null || end === null || start === end) return null;
    const startAssoc = relativeStart.assoc < 0 ? -1 : 1;
    const endAssoc = relativeEnd.assoc < 0 ? -1 : 1;
    return start < end
      ? { from: start, to: end, fromAssoc: startAssoc, toAssoc: endAssoc }
      : { from: end, to: start, fromAssoc: endAssoc, toAssoc: startAssoc };
  } catch {
    return null;
  }
}
