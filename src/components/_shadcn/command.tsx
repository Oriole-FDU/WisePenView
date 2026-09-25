'use client';

import { Header, ListBox, ListBoxItem, ListBoxSection, Separator } from '@heroui/react';
import { clsx } from 'clsx';
import { Command as CommandPrimitive } from 'cmdk';
import { Search } from 'lucide-react';
import {
  useId,
  useRef,
  useState,
  type ChangeEventHandler,
  type ComponentProps,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
  type Ref,
} from 'react';

import { Input } from '@/components/base/Input';
import styles from './command.module.less';

const COMMAND_NAVIGATION_KEY_SET = new Set(['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp']);

function CommandDialog({
  className,
  overlayClassName,
  contentClassName,
  onKeyDownCapture,
  onPointerMoveCapture,
  ...props
}: ComponentProps<typeof CommandPrimitive.Dialog>) {
  const pointerPositionRef = useRef<{ clientX: number; clientY: number } | undefined>(undefined);
  const [isKeyboardNavigating, setIsKeyboardNavigating] = useState(false);

  const handleKeyDownCapture = (event: KeyboardEvent<HTMLDivElement>) => {
    onKeyDownCapture?.(event);
    if (!event.defaultPrevented && COMMAND_NAVIGATION_KEY_SET.has(event.key)) {
      setIsKeyboardNavigating(true);
    }
  };

  const handlePointerMoveCapture = (event: PointerEvent<HTMLDivElement>) => {
    onPointerMoveCapture?.(event);
    const previousPosition = pointerPositionRef.current;
    const hasActualMovement = previousPosition
      ? previousPosition.clientX !== event.clientX || previousPosition.clientY !== event.clientY
      : event.movementX !== 0 || event.movementY !== 0;
    pointerPositionRef.current = { clientX: event.clientX, clientY: event.clientY };

    if (isKeyboardNavigating && hasActualMovement) {
      setIsKeyboardNavigating(false);
    }
  };

  return (
    <CommandPrimitive.Dialog
      data-slot="command"
      data-keyboard-navigation={isKeyboardNavigating || undefined}
      className={clsx(styles.command, className)}
      overlayClassName={clsx(styles.dialogOverlay, overlayClassName)}
      contentClassName={clsx(styles.dialogContent, contentClassName)}
      onKeyDownCapture={handleKeyDownCapture}
      onPointerMoveCapture={handlePointerMoveCapture}
      {...props}
    />
  );
}

type CommandInputProps = Omit<ComponentProps<typeof Input>, 'onChange'> & {
  onChange?: ComponentProps<typeof Input>['onChange'];
  onValueChange?: (value: string) => void;
};

function CommandInput({ className, onChange, onValueChange, ...props }: CommandInputProps) {
  const handleChange: ChangeEventHandler<HTMLInputElement> = (event) => {
    onChange?.(event);
    onValueChange?.(event.target.value);
  };

  return (
    <div data-slot="command-input-wrapper" className={styles.inputWrapper}>
      <Search className={styles.searchIcon} size={16} aria-hidden="true" />
      <Input
        {...props}
        fullWidth
        className={clsx(styles.searchInput, className)}
        onChange={handleChange}
      />
    </div>
  );
}

type CommandListProps = ComponentProps<typeof ListBox> & {
  viewportRef?: Ref<HTMLDivElement>;
};

function CommandList({
  className,
  selectionMode = 'none',
  viewportRef,
  ...props
}: CommandListProps) {
  return (
    <div ref={viewportRef} className={styles.listViewport}>
      <ListBox selectionMode={selectionMode} className={clsx(styles.list, className)} {...props} />
    </div>
  );
}

type CommandGroupProps = Omit<ComponentProps<typeof ListBoxSection>, 'children' | 'id'> & {
  children?: ReactNode;
  heading?: ReactNode;
  value?: string;
};

function CommandGroup({ children, className, heading, value, ...props }: CommandGroupProps) {
  const generatedId = useId();
  const id = value ?? generatedId;
  return (
    <ListBoxSection key={id} id={id} className={clsx(styles.group, className)} {...props}>
      {heading ? <Header className={styles.groupHeading}>{heading}</Header> : null}
      {children}
    </ListBoxSection>
  );
}

type CommandItemProps = Omit<
  ComponentProps<typeof ListBoxItem>,
  'id' | 'isDisabled' | 'onAction' | 'onSelect' | 'textValue'
> & {
  disabled?: boolean;
  keywords?: string[];
  onSelect?: (value: string) => void;
  textValue?: string;
  value: string;
};

function CommandItem({
  className,
  disabled,
  keywords,
  onSelect,
  textValue,
  value,
  ...props
}: CommandItemProps) {
  return (
    <ListBoxItem
      key={value}
      id={value}
      textValue={textValue ?? keywords?.[0] ?? value}
      isDisabled={disabled}
      onAction={() => onSelect?.(value)}
      className={clsx(styles.item, className)}
      {...props}
    />
  );
}

function CommandSeparator({ className, ...props }: ComponentProps<typeof Separator>) {
  return <Separator className={clsx(styles.separator, className)} {...props} />;
}

export { CommandDialog, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator };
