import { ListBox as HeroListBox } from '@heroui/react';
import { clsx } from 'clsx';
import type { ComponentProps } from 'react';

import overlayStyles from '@/components/base/Popover/shared/styles.module.scss';

function ListBoxRoot(props: ComponentProps<typeof HeroListBox>) {
  return <HeroListBox {...props} />;
}

function ListBoxItem({ className, ...props }: ComponentProps<typeof HeroListBox.Item>) {
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
