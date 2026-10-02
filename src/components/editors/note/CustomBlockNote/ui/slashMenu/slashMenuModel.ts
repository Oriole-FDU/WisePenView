import type { DefaultReactSuggestionItem } from '@blocknote/react';

import i18n from '@/i18n';

import { getSlashMenuItemKey } from './buildSlashMenuItems';

const SLASH_MENU_GROUP_ORDER = ['basic', 'common', 'advanced', 'ai', 'other'] as const;
type SlashMenuGroup = (typeof SLASH_MENU_GROUP_ORDER)[number];

interface SlashMenuItemMeta {
  group: SlashMenuGroup;
  order: number;
  titleKey: string;
}

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

const SLASH_MENU_ITEM_META = {
  paragraph: { group: 'basic', order: 0, titleKey: 'slashMenu.item.paragraph' },
  heading: { group: 'basic', order: 1, titleKey: 'slashMenu.item.heading1' },
  heading_2: { group: 'basic', order: 2, titleKey: 'slashMenu.item.heading2' },
  heading_3: { group: 'basic', order: 3, titleKey: 'slashMenu.item.heading3' },
  heading_4: { group: 'basic', order: 4, titleKey: 'slashMenu.item.heading4' },
  heading_5: { group: 'basic', order: 5, titleKey: 'slashMenu.item.heading5' },
  heading_6: { group: 'basic', order: 6, titleKey: 'slashMenu.item.heading6' },
  numbered_list: { group: 'basic', order: 7, titleKey: 'slashMenu.item.numberedList' },
  bullet_list: { group: 'basic', order: 8, titleKey: 'slashMenu.item.bulletList' },
  code_block: { group: 'basic', order: 9, titleKey: 'slashMenu.item.codeBlock' },
  quote: { group: 'basic', order: 10, titleKey: 'slashMenu.item.quote' },
  divider: { group: 'basic', order: 11, titleKey: 'slashMenu.item.divider' },
  link: { group: 'basic', order: 12, titleKey: 'slashMenu.item.link' },
  check_list: { group: 'common', order: 13, titleKey: 'slashMenu.item.checkList' },
  image: { group: 'common', order: 14, titleKey: 'slashMenu.item.image' },
  table: { group: 'common', order: 15, titleKey: 'slashMenu.item.table' },
  toggle_list: { group: 'common', order: 16, titleKey: 'slashMenu.item.toggleList' },
  toggle_heading: { group: 'common', order: 17, titleKey: 'slashMenu.item.toggleHeading1' },
  toggle_heading_2: { group: 'common', order: 18, titleKey: 'slashMenu.item.toggleHeading2' },
  toggle_heading_3: { group: 'common', order: 19, titleKey: 'slashMenu.item.toggleHeading3' },
  emoji: { group: 'common', order: 20, titleKey: 'slashMenu.item.emoji' },
} as const satisfies Record<string, SlashMenuItemMeta>;

type SlashMenuItemKey = keyof typeof SLASH_MENU_ITEM_META;

function getSlashMenuItemMeta(key: string | undefined): SlashMenuItemMeta | undefined {
  if (!key || !(key in SLASH_MENU_ITEM_META)) return undefined;
  return SLASH_MENU_ITEM_META[key as SlashMenuItemKey];
}

export function resolveSlashMenuGroup(item: DefaultReactSuggestionItem): string {
  const meta = getSlashMenuItemMeta(getSlashMenuItemKey(item));
  if (meta) {
    return meta.group;
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
  const meta = getSlashMenuItemMeta(getSlashMenuItemKey(item));
  return meta ? i18n.t(meta.titleKey, { ns: 'note' }) : item.title;
}

function compareSlashMenuItems(a: DefaultReactSuggestionItem, b: DefaultReactSuggestionItem) {
  const aGroup = resolveSlashMenuGroup(a);
  const bGroup = resolveSlashMenuGroup(b);
  const aGroupIndex = getSlashMenuGroupOrderIndex(aGroup);
  const bGroupIndex = getSlashMenuGroupOrderIndex(bGroup);
  if (aGroupIndex !== bGroupIndex) {
    return aGroupIndex - bGroupIndex;
  }
  if (aGroupIndex === Number.MAX_SAFE_INTEGER && aGroup !== bGroup) {
    return aGroup.localeCompare(bGroup, i18n.language);
  }

  const aOrder = getSlashMenuItemMeta(getSlashMenuItemKey(a))?.order ?? Number.MAX_SAFE_INTEGER;
  const bOrder = getSlashMenuItemMeta(getSlashMenuItemKey(b))?.order ?? Number.MAX_SAFE_INTEGER;
  if (aOrder !== Number.MAX_SAFE_INTEGER || bOrder !== Number.MAX_SAFE_INTEGER) {
    return aOrder - bOrder;
  }
  return resolveSlashMenuTitle(a).localeCompare(resolveSlashMenuTitle(b), i18n.language);
}

function getSlashMenuGroupOrderIndex(group: string) {
  const index = SLASH_MENU_GROUP_ORDER.indexOf(group as SlashMenuGroup);
  return index === -1 ? Number.MAX_SAFE_INTEGER : index;
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

  let currentOffset = 0;
  return [...groupMap.entries()].map(([group, groupItems]) => {
    const groupWithOffset = [group, groupItems, currentOffset] as const;
    currentOffset += groupItems.length;
    return groupWithOffset;
  });
}
