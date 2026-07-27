import i18n from '@/i18n';
import type { DefaultReactSuggestionItem } from '@blocknote/react';
import { getSlashMenuItemKey } from './buildSlashMenuItems';

const SLASH_MENU_GROUP_ORDER = ['basic', 'common', 'advanced', 'ai', 'other'] as const;
type SlashMenuGroup = (typeof SLASH_MENU_GROUP_ORDER)[number];

const SLASH_MENU_GROUP_LABEL_MAP: Record<string, SlashMenuGroup> = {
  标题: 'basic',
  基础: 'basic',
  基本块: 'basic',
  基础区块: 'basic',
  Headings: 'basic',
  Basic: 'basic',
  'Basic blocks': 'basic',
  高级功能: 'common',
  媒体: 'common',
  常用: 'common',
  Advanced: 'common',
  Media: 'common',
  advanced: 'advanced',
  高级: 'advanced',
  AI: 'ai',
  Other: 'other',
  其他: 'other',
};

const SLASH_MENU_GROUP_BY_KEY: Record<string, SlashMenuGroup> = {
  paragraph: 'basic',
  heading: 'basic',
  heading_2: 'basic',
  heading_3: 'basic',
  heading_4: 'basic',
  heading_5: 'basic',
  heading_6: 'basic',
  numbered_list: 'basic',
  bullet_list: 'basic',
  check_list: 'common',
  code_block: 'basic',
  quote: 'basic',
  divider: 'basic',
  link: 'basic',
  image: 'common',
  table: 'common',
  toggle_list: 'common',
  toggle_heading: 'common',
  toggle_heading_2: 'common',
  toggle_heading_3: 'common',
  emoji: 'common',
};

const SLASH_MENU_TITLE_BY_KEY: Record<string, string> = {
  paragraph: 'slashMenu.item.paragraph',
  heading: 'slashMenu.item.heading1',
  heading_2: 'slashMenu.item.heading2',
  heading_3: 'slashMenu.item.heading3',
  heading_4: 'slashMenu.item.heading4',
  heading_5: 'slashMenu.item.heading5',
  heading_6: 'slashMenu.item.heading6',
  numbered_list: 'slashMenu.item.numberedList',
  bullet_list: 'slashMenu.item.bulletList',
  check_list: 'slashMenu.item.checkList',
  code_block: 'slashMenu.item.codeBlock',
  quote: 'slashMenu.item.quote',
  divider: 'slashMenu.item.divider',
  link: 'slashMenu.item.link',
  image: 'slashMenu.item.image',
  table: 'slashMenu.item.table',
  toggle_list: 'slashMenu.item.toggleList',
  toggle_heading: 'slashMenu.item.toggleHeading1',
  toggle_heading_2: 'slashMenu.item.toggleHeading2',
  toggle_heading_3: 'slashMenu.item.toggleHeading3',
  emoji: 'slashMenu.item.emoji',
};

const SLASH_MENU_ITEM_ORDER = [
  'paragraph',
  'heading',
  'heading_2',
  'heading_3',
  'heading_4',
  'heading_5',
  'heading_6',
  'numbered_list',
  'bullet_list',
  'check_list',
  'code_block',
  'quote',
  'divider',
  'link',
  'image',
  'table',
  'toggle_list',
  'toggle_heading',
  'toggle_heading_2',
  'toggle_heading_3',
  'emoji',
] as const;

export function resolveSlashMenuGroup(item: DefaultReactSuggestionItem): string {
  const key = getSlashMenuItemKey(item);
  if (key && SLASH_MENU_GROUP_BY_KEY[key]) {
    return SLASH_MENU_GROUP_BY_KEY[key];
  }
  const rawGroup = typeof item.group === 'string' ? item.group : '';
  return SLASH_MENU_GROUP_LABEL_MAP[rawGroup] ?? (rawGroup || 'other');
}

export function resolveSlashMenuGroupLabel(group: string): string {
  return SLASH_MENU_GROUP_ORDER.includes(group as SlashMenuGroup)
    ? i18n.t(`slashMenu.group.${group}`, { ns: 'note' })
    : group;
}

export function resolveSlashMenuTitle(item: DefaultReactSuggestionItem) {
  const key = getSlashMenuItemKey(item);
  const titleKey = key ? SLASH_MENU_TITLE_BY_KEY[key] : undefined;
  return titleKey ? i18n.t(titleKey, { ns: 'note' }) : item.title;
}

function compareSlashMenuItems(a: DefaultReactSuggestionItem, b: DefaultReactSuggestionItem) {
  const aKey = getSlashMenuItemKey(a);
  const bKey = getSlashMenuItemKey(b);
  const aIndex = aKey
    ? SLASH_MENU_ITEM_ORDER.indexOf(aKey as (typeof SLASH_MENU_ITEM_ORDER)[number])
    : -1;
  const bIndex = bKey
    ? SLASH_MENU_ITEM_ORDER.indexOf(bKey as (typeof SLASH_MENU_ITEM_ORDER)[number])
    : -1;
  if (aIndex !== -1 || bIndex !== -1) {
    return (
      (aIndex === -1 ? Number.MAX_SAFE_INTEGER : aIndex) -
      (bIndex === -1 ? Number.MAX_SAFE_INTEGER : bIndex)
    );
  }
  return resolveSlashMenuTitle(a).localeCompare(resolveSlashMenuTitle(b), i18n.language);
}

export function sortSuggestionItemsForDisplay(items: DefaultReactSuggestionItem[]) {
  return [...items].sort(compareSlashMenuItems);
}

/** 对已按展示顺序排列的菜单项分组，并附带全局起始索引。 */
export function groupSortedSuggestionItems(items: DefaultReactSuggestionItem[]) {
  const groupMap = new Map<string, DefaultReactSuggestionItem[]>();
  for (const item of items) {
    const group = resolveSlashMenuGroup(item);
    const groupItems = groupMap.get(group);
    if (groupItems) {
      groupItems.push(item);
    } else {
      groupMap.set(group, [item]);
    }
  }

  const sortedGroups = [...groupMap.entries()].sort(([a], [b]) => {
    const aIndex = SLASH_MENU_GROUP_ORDER.indexOf(a as (typeof SLASH_MENU_GROUP_ORDER)[number]);
    const bIndex = SLASH_MENU_GROUP_ORDER.indexOf(b as (typeof SLASH_MENU_GROUP_ORDER)[number]);
    if (aIndex === -1 && bIndex === -1) {
      return a.localeCompare(b, i18n.language);
    }
    if (aIndex === -1) return 1;
    if (bIndex === -1) return -1;
    return aIndex - bIndex;
  });

  let currentOffset = 0;
  return sortedGroups.map(([group, groupItems]) => {
    const groupWithOffset = [group, groupItems, currentOffset] as const;
    currentOffset += groupItems.length;
    return groupWithOffset;
  });
}
