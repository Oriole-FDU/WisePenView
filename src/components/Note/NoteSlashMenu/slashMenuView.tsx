import type { DefaultReactSuggestionItem } from '@blocknote/react';
import { Dropdown, Header, ListBoxItem, ListBoxSection } from '@heroui/react';
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
  Table2,
  TextQuote,
  Type,
} from 'lucide-react';
import { createElement } from 'react';
import { getSlashMenuItemKey } from './buildSlashMenuItems';
import { groupSuggestionItems, resolveSlashMenuTitle } from './slashMenuModel';
import styles from './style.module.less';

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
  table: Table2,
  image: Image,
  emoji: Smile,
};

const SLASH_MENU_ICON_COLOR_BY_KEY: Record<string, string> = {
  divider: styles.iconWarning,
  check_list: styles.iconSuccess,
  code_block: styles.iconSuccess,
  image: styles.iconWarning,
  table: styles.iconSuccess,
  emoji: styles.iconAccent,
};

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
  return styles.iconTheme;
}

function resolveSlashMenuIcon(item: DefaultReactSuggestionItem) {
  const key = getSlashMenuItemKey(item);
  const Icon = key ? SLASH_MENU_ICON_MAP[key] : undefined;
  if (Icon) {
    return createElement(Icon, { size: 18, strokeWidth: 2 });
  }
  return item.icon ?? null;
}

export function SlashMenuItemContent({ item }: { item: DefaultReactSuggestionItem }) {
  return (
    <>
      <span className={clsx(styles.icon, resolveSlashMenuIconColor(item))}>
        {resolveSlashMenuIcon(item)}
      </span>
      <span className={styles.label}>{resolveSlashMenuTitle(item)}</span>
    </>
  );
}

export function SlashMenuDropdownItems({
  getItemId,
  items,
}: {
  getItemId: (item: DefaultReactSuggestionItem, index: number) => string;
  items: DefaultReactSuggestionItem[];
}) {
  const groupedItems = groupSuggestionItems(items);

  return (
    <>
      {groupedItems.map(([group, groupItems], groupIndex) => {
        const currentOffset = groupedItems
          .slice(0, groupIndex)
          .reduce((count, [, previousGroupItems]) => count + previousGroupItems.length, 0);

        return (
          <Dropdown.Section id={`slash-group-${group}`} className={styles.section} key={group}>
            <Header className={styles.sectionTitle}>{group}</Header>
            {groupItems.map((item, itemIndexInGroup) => {
              const itemIndex = currentOffset + itemIndexInGroup;
              const title = resolveSlashMenuTitle(item);

              return (
                <Dropdown.Item
                  key={getItemId(item, itemIndex)}
                  id={getItemId(item, itemIndex)}
                  textValue={title}
                  className={styles.item}
                >
                  <SlashMenuItemContent item={item} />
                </Dropdown.Item>
              );
            })}
          </Dropdown.Section>
        );
      })}
    </>
  );
}

export function SlashMenuListBoxItems({
  getItemId,
  items,
  onItemClick,
}: {
  getItemId: (item: DefaultReactSuggestionItem, index: number) => string;
  items: DefaultReactSuggestionItem[];
  onItemClick?: (item: DefaultReactSuggestionItem) => void;
}) {
  const groupedItems = groupSuggestionItems(items);

  return (
    <>
      {groupedItems.map(([group, groupItems], groupIndex) => {
        const currentOffset = groupedItems
          .slice(0, groupIndex)
          .reduce((count, [, previousGroupItems]) => count + previousGroupItems.length, 0);

        return (
          <ListBoxSection id={`slash-group-${group}`} className={styles.section} key={group}>
            <Header className={styles.sectionTitle}>{group}</Header>
            {groupItems.map((item, itemIndexInGroup) => {
              const itemIndex = currentOffset + itemIndexInGroup;
              const title = resolveSlashMenuTitle(item);

              return (
                <ListBoxItem
                  key={getItemId(item, itemIndex)}
                  id={getItemId(item, itemIndex)}
                  textValue={title}
                  className={styles.item}
                  onMouseDown={(event) => event.preventDefault()}
                  onPress={() => onItemClick?.(item)}
                >
                  <SlashMenuItemContent item={item} />
                </ListBoxItem>
              );
            })}
          </ListBoxSection>
        );
      })}
    </>
  );
}
