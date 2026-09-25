import { ToggleButton, Tooltip } from '@heroui/react';
import type { ReactNode } from 'react';

import { AppButton, type AppButtonProps } from '@/components/base/Button';
import { cn } from '@/utils/cn';

import styles from '../style.module.less';
import { stopToolbarMouseDown } from '../utils';

export interface ButtonGroupChildProps {
  __button_group_child?: AppButtonProps['__button_group_child'];
}

interface ToolbarButtonProps extends ButtonGroupChildProps {
  label: string;
  icon: ReactNode;
  isDisabled?: boolean;
  isActive?: boolean;
  className?: string;
  onHoverChange?: AppButtonProps['onHoverChange'];
  onPress?: () => void;
}

export function ToolbarButton({
  label,
  icon,
  isDisabled,
  isActive,
  className,
  onHoverChange,
  onPress,
  __button_group_child: isButtonGroupChild,
}: ToolbarButtonProps) {
  const button = (
    <AppButton
      __button_group_child={isButtonGroupChild}
      aria-label={label}
      aria-pressed={isActive}
      className={cn(styles.toolbarButton, className)}
      isDisabled={isDisabled}
      isIconOnly
      size="sm"
      variant="ghost"
      onHoverChange={onHoverChange}
      onMouseDown={stopToolbarMouseDown}
      onPress={onPress}
    >
      {icon}
    </AppButton>
  );

  return (
    <Tooltip>
      {isDisabled ? (
        <Tooltip.Trigger<'span'>
          render={(props) => <span {...props} role={undefined} tabIndex={undefined} />}
        >
          {button}
        </Tooltip.Trigger>
      ) : (
        button
      )}
      <Tooltip.Content placement="bottom">{label}</Tooltip.Content>
    </Tooltip>
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
  const button = (
    <ToggleButton
      aria-label={label}
      id={id}
      isDisabled={isDisabled}
      isIconOnly
      size="sm"
      variant="ghost"
      onMouseDown={stopToolbarMouseDown}
      onPress={onPress}
    >
      {icon}
    </ToggleButton>
  );

  return (
    <Tooltip>
      {isDisabled ? (
        <Tooltip.Trigger<'span'>
          render={(props) => <span {...props} role={undefined} tabIndex={undefined} />}
        >
          {button}
        </Tooltip.Trigger>
      ) : (
        button
      )}
      <Tooltip.Content placement="bottom">{label}</Tooltip.Content>
    </Tooltip>
  );
}
