import type { CustomBlockNoteEditor } from '@/components/Note/CustomBlockNote/registry/noteEditorComposition';
import i18n from '@/i18n';
import { editorHasBlockWithType } from '@blocknote/core';
import {
  Braces,
  CheckSquare,
  Heading1,
  Heading2,
  Heading3,
  Heading4,
  Heading5,
  Heading6,
  List,
  ListOrdered,
  ListTree,
  TextQuote,
  Type,
  type LucideIcon,
} from 'lucide-react';
import { isRecord, toBlockUpdate, type NoteBlock } from './utils';

type BlockTypeProps = Record<string, boolean | number | string>;

export interface BlockTypeMenuItem {
  key: string;
  label: string;
  icon: LucideIcon;
  type: string;
  props?: BlockTypeProps;
}

const primaryBlockTypeItems: BlockTypeMenuItem[] = [
  { key: 'paragraph', label: 'editor.blockType.paragraph', icon: Type, type: 'paragraph' },
  {
    key: 'heading-1',
    label: 'editor.blockType.heading1',
    icon: Heading1,
    type: 'heading',
    props: { level: 1, isToggleable: false },
  },
  {
    key: 'heading-2',
    label: 'editor.blockType.heading2',
    icon: Heading2,
    type: 'heading',
    props: { level: 2, isToggleable: false },
  },
  {
    key: 'heading-3',
    label: 'editor.blockType.heading3',
    icon: Heading3,
    type: 'heading',
    props: { level: 3, isToggleable: false },
  },
  {
    key: 'numbered-list',
    label: 'editor.blockType.numberedList',
    icon: ListOrdered,
    type: 'numberedListItem',
  },
  { key: 'bullet-list', label: 'editor.blockType.bulletList', icon: List, type: 'bulletListItem' },
  {
    key: 'check-list',
    label: 'editor.blockType.checkList',
    icon: CheckSquare,
    type: 'checkListItem',
  },
  { key: 'code-block', label: 'editor.blockType.codeBlock', icon: Braces, type: 'codeBlock' },
  { key: 'quote', label: 'editor.blockType.quote', icon: TextQuote, type: 'quote' },
  {
    key: 'toggle-list',
    label: 'editor.blockType.toggleList',
    icon: ListTree,
    type: 'toggleListItem',
  },
];

const moreHeadingItems: BlockTypeMenuItem[] = [
  {
    key: 'heading-4',
    label: 'editor.blockType.heading4',
    icon: Heading4,
    type: 'heading',
    props: { level: 4, isToggleable: false },
  },
  {
    key: 'heading-5',
    label: 'editor.blockType.heading5',
    icon: Heading5,
    type: 'heading',
    props: { level: 5, isToggleable: false },
  },
  {
    key: 'heading-6',
    label: 'editor.blockType.heading6',
    icon: Heading6,
    type: 'heading',
    props: { level: 6, isToggleable: false },
  },
  {
    key: 'toggle-heading-1',
    label: 'editor.blockType.toggleHeading1',
    icon: Heading1,
    type: 'heading',
    props: { level: 1, isToggleable: true },
  },
  {
    key: 'toggle-heading-2',
    label: 'editor.blockType.toggleHeading2',
    icon: Heading2,
    type: 'heading',
    props: { level: 2, isToggleable: true },
  },
  {
    key: 'toggle-heading-3',
    label: 'editor.blockType.toggleHeading3',
    icon: Heading3,
    type: 'heading',
    props: { level: 3, isToggleable: true },
  },
];

const quickBlockTypeKeys = new Set([
  'paragraph',
  'heading-1',
  'heading-2',
  'heading-3',
  'numbered-list',
  'bullet-list',
  'check-list',
  'code-block',
  'quote',
  'toggle-list',
]);

function toPropTypeMap(props?: BlockTypeProps) {
  if (!props) {
    return undefined;
  }
  return Object.fromEntries(
    Object.entries(props).map(([key, value]) => [key, typeof value])
  ) as Record<string, 'boolean' | 'number' | 'string'>;
}

function isBlockTypeItemAvailable(editor: CustomBlockNoteEditor, item: BlockTypeMenuItem) {
  const propTypes = toPropTypeMap(item.props);
  return propTypes
    ? editorHasBlockWithType(editor, item.type, propTypes)
    : editorHasBlockWithType(editor, item.type);
}

export function blockMatchesBlockTypeItem(
  block: NoteBlock | undefined,
  item: BlockTypeMenuItem
): boolean {
  if (!block || block.type !== item.type) {
    return false;
  }
  const props = isRecord(block.props) ? block.props : {};
  return Object.entries(item.props ?? {}).every(([key, value]) => props[key] === value);
}

export function getAvailableBlockTypeItems(editor: CustomBlockNoteEditor) {
  const localizeItem = (item: BlockTypeMenuItem): BlockTypeMenuItem => ({
    ...item,
    label: i18n.t(item.label, { ns: 'note' }),
  });
  const primaryItems = primaryBlockTypeItems
    .filter((item) => isBlockTypeItemAvailable(editor, item))
    .map(localizeItem);
  const headingItems = moreHeadingItems
    .filter((item) => isBlockTypeItemAvailable(editor, item))
    .map(localizeItem);

  return {
    primaryItems,
    headingItems,
    allItems: [...primaryItems, ...headingItems],
    quickItems: primaryItems.filter((item) => quickBlockTypeKeys.has(item.key)),
  };
}

export function applyBlockTypeToBlocks(
  editor: CustomBlockNoteEditor,
  blocks: NoteBlock[],
  item: BlockTypeMenuItem
) {
  editor.transact(() => {
    for (const block of blocks) {
      editor.updateBlock(
        block,
        toBlockUpdate({
          type: item.type,
          props: item.props,
        })
      );
    }
  });
}
