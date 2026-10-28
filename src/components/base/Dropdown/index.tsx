import { Dropdown as HeroDropdown } from '@heroui/react';
import { clsx } from 'clsx';
import type { ComponentProps } from 'react';

import overlayStyles from '@/components/base/Popover/shared/styles.module.scss';

import styles from './style.module.scss';

function DropdownRoot(props: ComponentProps<typeof HeroDropdown>) {
  return <HeroDropdown {...props} />;
}

function DropdownPopover({ className, ...props }: ComponentProps<typeof HeroDropdown.Popover>) {
  return (
    <HeroDropdown.Popover
      className={clsx(
        overlayStyles.surface,
        overlayStyles.choiceSurface,
        styles.popover,
        className
      )}
      {...props}
    />
  );
}

function DropdownItem({ className, ...props }: ComponentProps<typeof HeroDropdown.Item>) {
  return <HeroDropdown.Item className={clsx(overlayStyles.item, className)} {...props} />;
}

export const Dropdown = Object.assign(DropdownRoot, {
  Item: DropdownItem,
  ItemIndicator: HeroDropdown.ItemIndicator,
  Menu: HeroDropdown.Menu,
  Popover: DropdownPopover,
  Root: DropdownRoot,
  Section: HeroDropdown.Section,
  SubmenuIndicator: HeroDropdown.SubmenuIndicator,
  SubmenuTrigger: HeroDropdown.SubmenuTrigger,
  Trigger: HeroDropdown.Trigger,
});

export default Dropdown;
