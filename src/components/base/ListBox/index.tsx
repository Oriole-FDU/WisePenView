import { ListBox as HeroListBox } from '@heroui/react';
import { clsx } from 'clsx';

import overlayStyles from '@/components/base/Popover/_common/styles.module.scss';

import type { ListBoxItemProps, ListBoxProps } from './index.type';

function ListBoxRoot(props: ListBoxProps) {
  return <HeroListBox {...props} />;
}

function ListBoxItem({ className, ...props }: ListBoxItemProps) {
  return <HeroListBox.Item className={clsx(overlayStyles.item, className)} {...props} />;
}

export const ListBox = Object.assign(ListBoxRoot, {
  Item: ListBoxItem,
  ItemIndicator: HeroListBox.ItemIndicator,
  Root: ListBoxRoot,
  Section: HeroListBox.Section,
});

export { ListBoxItem };
export default ListBox;
