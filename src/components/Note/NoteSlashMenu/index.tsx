import { useNoteEditorReadOnlyContext } from '@/components/Note/CustomBlockNote/editorReadOnly';
import { filterSuggestionItems } from '@blocknote/core/extensions';
import type { DefaultReactSuggestionItem, SuggestionMenuProps } from '@blocknote/react';
import { SuggestionMenuController } from '@blocknote/react';
import { Header, ListBox, ListBoxItem, ListBoxSection } from '@heroui/react';
import clsx from 'clsx';
import {
  Braces,
  CheckSquare,
  Heading1,
  Heading2,
  Heading3,
  Heading4,
  Heading5,
  Heading6,
  Image,
  Link as LinkIcon,
  List,
  ListOrdered,
  ListTree,
  Minus,
  Smile,
  Table,
  TextQuote,
  Type,
} from 'lucide-react';
import { createElement } from 'react';
import {
  collectPluginSlashMenuItems,
  getFilteredDefaultReactSlashMenuItems,
  getSlashMenuItemKey,
} from './buildSlashMenuItems';
import type { NoteSlashMenuProps } from './index.type';
import styles from './style.module.less';

/**
 * BlockNote 在 `getDefaultReactSlashMenuItems` 里为每个默认项设置了稳定字段 `key`，
 * 与字典 `slash_menu.*` 及图标映射一致；此处声明要从 / 菜单中移除的默认项。
 *
 * 当前移除：
 * - `file` → 通用文档/附件
 * - `audio`、`video` → 媒体块
 */
const NOTE_EDITOR_HIDDEN_DEFAULT_SLASH_MENU_KEYS = ['file', 'audio', 'video'] as const;

const NOTE_EDITOR_HIDDEN_DEFAULT_SLASH_MENU_KEY_SET = new Set<string>(
  NOTE_EDITOR_HIDDEN_DEFAULT_SLASH_MENU_KEYS
);

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

const SLASH_MENU_ICON_MAP: Record<string, typeof Type> = {
  paragraph: Type,
  heading: Heading1,
  heading_2: Heading2,
  heading_3: Heading3,
  heading_4: Heading4,
  heading_5: Heading5,
  heading_6: Heading6,
  toggle_heading: Heading1,
  toggle_heading_2: Heading2,
  toggle_heading_3: Heading3,
  quote: TextQuote,
  toggle_list: ListTree,
  numbered_list: ListOrdered,
  bullet_list: List,
  check_list: CheckSquare,
  code_block: Braces,
  divider: Minus,
  link: LinkIcon,
  table: Table,
  image: Image,
  emoji: Smile,
};

const SLASH_MENU_ICON_COLOR_BY_KEY: Record<string, string> = {
  paragraph: styles.iconPrimary,
  heading: styles.iconPrimary,
  heading_2: styles.iconPrimary,
  heading_3: styles.iconPrimary,
  heading_4: styles.iconPrimary,
  heading_5: styles.iconPrimary,
  heading_6: styles.iconPrimary,
  numbered_list: styles.iconAccent,
  bullet_list: styles.iconAccent,
  check_list: styles.iconSuccess,
  code_block: styles.iconSuccess,
  quote: styles.iconPrimary,
  divider: styles.iconWarning,
  link: styles.iconPrimary,
  image: styles.iconWarning,
  table: styles.iconSuccess,
  toggle_list: styles.iconPrimary,
  toggle_heading: styles.iconPrimary,
  toggle_heading_2: styles.iconPrimary,
  toggle_heading_3: styles.iconPrimary,
  emoji: styles.iconAccent,
};

function resolveSlashMenuGroup(item: DefaultReactSuggestionItem): string {
  const key = getSlashMenuItemKey(item);
  if (key && SLASH_MENU_GROUP_BY_KEY[key]) {
    return SLASH_MENU_GROUP_BY_KEY[key];
  }
  const rawGroup = typeof item.group === 'string' ? item.group : '';
  return SLASH_MENU_GROUP_LABEL_MAP[rawGroup] ?? rawGroup ?? '其他';
}

function resolveSlashMenuTitle(item: DefaultReactSuggestionItem) {
  const key = getSlashMenuItemKey(item);
  return key ? (SLASH_MENU_TITLE_BY_KEY[key] ?? item.title) : item.title;
}

function resolveSlashMenuIconColor(item: DefaultReactSuggestionItem) {
  const key = getSlashMenuItemKey(item);
  if (key && SLASH_MENU_ICON_COLOR_BY_KEY[key]) {
    return SLASH_MENU_ICON_COLOR_BY_KEY[key];
  }
  if (item.group === 'AI') {
    return styles.iconAccent;
  }
  if (item.title === '公式') {
    return styles.iconMuted;
  }
  return styles.iconPrimary;
}

function resolveSlashMenuIcon(item: DefaultReactSuggestionItem) {
  const key = getSlashMenuItemKey(item);
  const Icon = key ? SLASH_MENU_ICON_MAP[key] : undefined;
  if (Icon) {
    return createElement(Icon, { size: 18, strokeWidth: 2 });
  }
  return item.icon ?? null;
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

function groupSuggestionItems(items: DefaultReactSuggestionItem[]) {
  const groupMap = new Map<string, DefaultReactSuggestionItem[]>();
  for (const item of [...items].sort(compareSlashMenuItems)) {
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

function getSuggestionItemId(index: number) {
  return `slash-item-${index}`;
}

function SlashMenuState({ text }: { text: string }) {
  return (
    <ListBox aria-label="斜杠菜单" className={styles.menu}>
      <ListBoxItem id="slash-menu-state" textValue={text} isDisabled className={styles.emptyItem}>
        {text}
      </ListBoxItem>
    </ListBox>
  );
}

function NoteSuggestionMenu({
  items,
  loadingState,
  selectedIndex,
  onItemClick,
}: SuggestionMenuProps<DefaultReactSuggestionItem>) {
  if (loadingState === 'loading-initial') {
    return <SlashMenuState text="加载中..." />;
  }

  if (items.length === 0) {
    return <SlashMenuState text="无匹配项" />;
  }

  const groupedItems = groupSuggestionItems(items);
  const groupStartIndexes = groupedItems.map(([, groupItems], groupIndex) =>
    groupedItems
      .slice(0, groupIndex)
      .reduce((count, [, previousGroupItems]) => count + previousGroupItems.length, 0)
  );
  const selectedItemIndex = selectedIndex ?? -1;
  const selectedKey = selectedItemIndex >= 0 ? getSuggestionItemId(selectedItemIndex) : undefined;

  return (
    <ListBox
      aria-label="斜杠菜单"
      selectionMode="single"
      selectedKeys={selectedKey ? [selectedKey] : []}
      className={styles.menu}
    >
      {groupedItems.map(([group, groupItems], groupIndex) => (
        <ListBoxSection id={`slash-group-${group}`} className={styles.section} key={group}>
          <Header className={styles.sectionTitle}>{group}</Header>
          {groupItems.map((item, itemIndexInGroup) => {
            const itemIndex = groupStartIndexes[groupIndex] + itemIndexInGroup;
            const title = resolveSlashMenuTitle(item);
            return (
              <ListBoxItem
                key={getSuggestionItemId(itemIndex)}
                id={getSuggestionItemId(itemIndex)}
                textValue={title}
                className={styles.item}
                onMouseDown={(event) => {
                  event.preventDefault();
                }}
                onPress={() => onItemClick?.(item)}
              >
                <span className={clsx(styles.icon, resolveSlashMenuIconColor(item))}>
                  {resolveSlashMenuIcon(item)}
                </span>
                <span className={styles.label}>{title}</span>
              </ListBoxItem>
            );
          })}
        </ListBoxSection>
      ))}
    </ListBox>
  );
}

const NoteSlashMenu = ({ editor, plugins }: NoteSlashMenuProps) => {
  const readOnly = useNoteEditorReadOnlyContext();
  if (readOnly) {
    return null;
  }

  const getItems = async (query: string) => {
    const items = [
      ...getFilteredDefaultReactSlashMenuItems(
        editor,
        NOTE_EDITOR_HIDDEN_DEFAULT_SLASH_MENU_KEY_SET
      ),
      ...collectPluginSlashMenuItems(plugins, editor),
    ];
    return filterSuggestionItems(items, query);
  };

  return (
    <div className={styles.host}>
      <SuggestionMenuController
        triggerCharacter="/"
        getItems={getItems}
        suggestionMenuComponent={NoteSuggestionMenu}
        shouldOpen={(state) => !state.selection.$from.parent.type.isInGroup('tableContent')}
      />
    </div>
  );
};

export default NoteSlashMenu;
