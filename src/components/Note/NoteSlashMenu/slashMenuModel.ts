import type { DefaultReactSuggestionItem } from '@blocknote/react';
import { getSlashMenuItemKey } from './buildSlashMenuItems';

const SLASH_MENU_GROUP_ORDER = ['基础', '常用', '高级', 'AI', '其他'] as const;

const SLASH_MENU_GROUP_LABEL_MAP: Record<string, (typeof SLASH_MENU_GROUP_ORDER)[number]> = {
  标题: '基础',
  基础: '基础',
  基本块: '基础',
  基础区块: '基础',
  高级功能: '常用',
  媒体: '常用',
  高级: '高级',
  AI: 'AI',
  其他: '其他',
};

const SLASH_MENU_GROUP_BY_KEY: Record<string, (typeof SLASH_MENU_GROUP_ORDER)[number]> = {
  paragraph: '基础',
  heading: '基础',
  heading_2: '基础',
  heading_3: '基础',
  heading_4: '基础',
  heading_5: '基础',
  heading_6: '基础',
  numbered_list: '基础',
  bullet_list: '基础',
  check_list: '常用',
  code_block: '基础',
  quote: '基础',
  divider: '基础',
  link: '基础',
  image: '常用',
  table: '常用',
  toggle_list: '常用',
  toggle_heading: '常用',
  toggle_heading_2: '常用',
  toggle_heading_3: '常用',
  emoji: '常用',
};

const SLASH_MENU_TITLE_BY_KEY: Record<string, string> = {
  paragraph: '文本',
  heading: '一级标题',
  heading_2: '二级标题',
  heading_3: '三级标题',
  heading_4: '四级标题',
  heading_5: '五级标题',
  heading_6: '六级标题',
  numbered_list: '有序列表',
  bullet_list: '无序列表',
  check_list: '任务',
  code_block: '代码块',
  quote: '引用',
  divider: '分隔线',
  link: '链接',
  image: '图片',
  table: '表格',
  toggle_list: '折叠列表',
  toggle_heading: '可折叠一级标题',
  toggle_heading_2: '可折叠二级标题',
  toggle_heading_3: '可折叠三级标题',
  emoji: 'Emoji',
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
  return SLASH_MENU_GROUP_LABEL_MAP[rawGroup] ?? rawGroup ?? '其他';
}

export function resolveSlashMenuTitle(item: DefaultReactSuggestionItem) {
  const key = getSlashMenuItemKey(item);
  return key ? (SLASH_MENU_TITLE_BY_KEY[key] ?? item.title) : item.title;
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
  return resolveSlashMenuTitle(a).localeCompare(resolveSlashMenuTitle(b), 'zh-CN');
}

export function sortSuggestionItemsForDisplay(items: DefaultReactSuggestionItem[]) {
  return [...items].sort(compareSlashMenuItems);
}

export function groupSuggestionItems(items: DefaultReactSuggestionItem[]) {
  const groupMap = new Map<string, DefaultReactSuggestionItem[]>();
  for (const item of sortSuggestionItemsForDisplay(items)) {
    const group = resolveSlashMenuGroup(item);
    groupMap.set(group, [...(groupMap.get(group) ?? []), item]);
  }

  return [...groupMap.entries()].sort(([a], [b]) => {
    const aIndex = SLASH_MENU_GROUP_ORDER.indexOf(a as (typeof SLASH_MENU_GROUP_ORDER)[number]);
    const bIndex = SLASH_MENU_GROUP_ORDER.indexOf(b as (typeof SLASH_MENU_GROUP_ORDER)[number]);
    if (aIndex === -1 && bIndex === -1) {
      return a.localeCompare(b, 'zh-CN');
    }
    if (aIndex === -1) return 1;
    if (bIndex === -1) return -1;
    return aIndex - bIndex;
  });
}
