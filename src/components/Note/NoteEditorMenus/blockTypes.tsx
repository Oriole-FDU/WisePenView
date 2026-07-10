import type { CustomBlockNoteEditor } from '@/components/Note/CustomBlockNote/blockNoteSchema';
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
import { isRecord, toBlockUpdate, type NoteBlock, type NotePartialBlock } from './utils';

export type BlockTypeProps = Record<string, boolean | number | string>;

export interface BlockTypeMenuItem {
  key: string;
  label: string;
  icon: LucideIcon;
  type: string;
  props?: BlockTypeProps;
}

export const primaryBlockTypeItems: BlockTypeMenuItem[] = [
  { key: 'paragraph', label: '正文', icon: Type, type: 'paragraph' },
  {
    key: 'heading-1',
    label: '一级标题',
    icon: Heading1,
    type: 'heading',
    props: { level: 1, isToggleable: false },
  },
  {
    key: 'heading-2',
    label: '二级标题',
    icon: Heading2,
    type: 'heading',
    props: { level: 2, isToggleable: false },
  },
  {
    key: 'heading-3',
    label: '三级标题',
    icon: Heading3,
    type: 'heading',
    props: { level: 3, isToggleable: false },
  },
  { key: 'numbered-list', label: '有序列表', icon: ListOrdered, type: 'numberedListItem' },
  { key: 'bullet-list', label: '无序列表', icon: List, type: 'bulletListItem' },
  { key: 'check-list', label: '任务', icon: CheckSquare, type: 'checkListItem' },
  { key: 'code-block', label: '代码块', icon: Braces, type: 'codeBlock' },
  { key: 'quote', label: '引用', icon: TextQuote, type: 'quote' },
  { key: 'toggle-list', label: '折叠列表', icon: ListTree, type: 'toggleListItem' },
];

export const moreHeadingItems: BlockTypeMenuItem[] = [
  {
    key: 'heading-4',
    label: '四级标题',
    icon: Heading4,
    type: 'heading',
    props: { level: 4, isToggleable: false },
  },
  {
    key: 'heading-5',
    label: '五级标题',
    icon: Heading5,
    type: 'heading',
    props: { level: 5, isToggleable: false },
  },
  {
    key: 'heading-6',
    label: '六级标题',
    icon: Heading6,
    type: 'heading',
    props: { level: 6, isToggleable: false },
  },
  {
    key: 'toggle-heading-1',
    label: '可折叠一级标题',
    icon: Heading1,
    type: 'heading',
    props: { level: 1, isToggleable: true },
  },
  {
    key: 'toggle-heading-2',
    label: '可折叠二级标题',
    icon: Heading2,
    type: 'heading',
    props: { level: 2, isToggleable: true },
  },
  {
    key: 'toggle-heading-3',
    label: '可折叠三级标题',
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

export function isBlockTypeItemAvailable(editor: CustomBlockNoteEditor, item: BlockTypeMenuItem) {
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
  const primaryItems = primaryBlockTypeItems.filter((item) =>
    isBlockTypeItemAvailable(editor, item)
  );
  const headingItems = moreHeadingItems.filter((item) => isBlockTypeItemAvailable(editor, item));

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

export function blockTypeItemToPartialBlock(item: BlockTypeMenuItem): NotePartialBlock {
  return {
    type: item.type,
    props: item.props,
  } as NotePartialBlock;
}
