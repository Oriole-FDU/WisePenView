import type { Dropdown as HeroDropdown } from '@heroui/react';
import type { ComponentProps } from 'react';

export type DropdownProps = ComponentProps<typeof HeroDropdown>;

export type DropdownPopoverProps = ComponentProps<typeof HeroDropdown.Popover>;

export type DropdownItemProps = ComponentProps<typeof HeroDropdown.Item>;
