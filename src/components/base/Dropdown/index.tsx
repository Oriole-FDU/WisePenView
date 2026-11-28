import { Dropdown as HeroDropdown } from '@heroui/react';
import { clsx } from 'clsx';

import overlayStyles from '@/components/base/_common/overlay/style.module.scss';

import type { DropdownItemProps, DropdownPopoverProps, DropdownProps } from './index.type';
import styles from './style.module.scss';

function DropdownRoot(props: DropdownProps) {
  return <HeroDropdown {...props} />;
}

function DropdownPopover({ className, ...props }: DropdownPopoverProps) {
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

function DropdownItem({ className, ...props }: DropdownItemProps) {
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
