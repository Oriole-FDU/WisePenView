import AppIconButton from '@/components/Button/AppIconButton';
import type { Button } from '@heroui/react';
import type { ComponentProps, ReactNode } from 'react';
import { stopToolbarMouseDown } from '../utils';

export type ButtonGroupChildProps = Pick<ComponentProps<typeof Button>, '__button_group_child'>;

interface ToolbarButtonProps {
  label: string;
  icon: ReactNode;
  isDisabled?: boolean;
  className?: string;
  onMouseDownCapture?: ComponentProps<typeof AppIconButton>['onMouseDownCapture'];
  onPress?: () => void;
}

export function ToolbarButton({
  label,
  icon,
  isDisabled,
  className,
  onMouseDownCapture,
  onPress,
}: ToolbarButtonProps) {
  return (
    <AppIconButton
      icon={icon}
      label={label}
      size="sm"
      isDisabled={isDisabled}
      className={className}
      onMouseDownCapture={onMouseDownCapture}
      onMouseDown={stopToolbarMouseDown}
      onPress={onPress}
    />
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
    <AppIconButton
      icon={icon}
      label={label}
      toggleId={id}
      size="sm"
      isDisabled={isDisabled}
      onMouseDown={stopToolbarMouseDown}
      onPress={onPress}
    />
  );
}
