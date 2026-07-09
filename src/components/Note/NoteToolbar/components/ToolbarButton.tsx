import { Button, ToggleButton } from '@heroui/react';
import type { ComponentProps, ReactNode } from 'react';
import { stopToolbarMouseDown } from '../utils';

export type ButtonGroupChildProps = Pick<ComponentProps<typeof Button>, '__button_group_child'>;

interface ToolbarButtonProps extends ButtonGroupChildProps {
  label: string;
  icon: ReactNode;
  isDisabled?: boolean;
  className?: string;
  onPress?: () => void;
}

export function ToolbarButton({
  label,
  icon,
  isDisabled,
  className,
  onPress,
  ...buttonGroupProps
}: ToolbarButtonProps) {
  return (
    <Button
      {...buttonGroupProps}
      variant="ghost"
      size="sm"
      isIconOnly
      isDisabled={isDisabled}
      aria-label={label}
      className={className}
      onMouseDown={stopToolbarMouseDown}
      onPress={onPress}
    >
      {icon}
    </Button>
  );
}

interface ToolbarToggleButtonProps {
  id: string;
  label: string;
  icon: ReactNode;
  isDisabled?: boolean;
  onPress?: () => void;
}

export function ToolbarToggleButton({
  id,
  label,
  icon,
  isDisabled,
  onPress,
}: ToolbarToggleButtonProps) {
  return (
    <ToggleButton
      id={id}
      variant="ghost"
      size="sm"
      isIconOnly
      isDisabled={isDisabled}
      aria-label={label}
      onMouseDown={stopToolbarMouseDown}
      onPress={onPress}
    >
      {icon}
    </ToggleButton>
  );
}
