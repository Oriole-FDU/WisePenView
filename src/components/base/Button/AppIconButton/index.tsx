import { ToggleButton, Tooltip } from '@heroui/react';
import { cloneElement, type ComponentProps } from 'react';

import { TOOLTIP_FOCUS_PASSTHROUGH_PROPS } from '@/layouts/_common/a11y/tooltipFocusPassthrough';
import { cn } from '@/utils/cn';

import type { AppIconButtonProps } from './index.type';
import styles from './style.module.less';

function AppIconButton({
  icon,
  label,
  className,
  isActive,
  isDisabled = false,
  onClick,
  onPress,
  overlayTrigger,
  ref,
  size = 'md',
  toggleId,
  tooltip = {},
  variant = 'ghost',
  ...buttonProps
}: AppIconButtonProps) {
  // ToggleButton 与原生 button 的事件泛型不同，实际仅透传二者共有的 DOM 属性。
  const toggleButtonProps = buttonProps as ComponentProps<typeof ToggleButton>;
  const classNames = cn(
    styles.root,
    styles[size],
    styles[variant],
    isActive && styles.active,
    className
  );
  const button = toggleId ? (
    <ToggleButton
      {...toggleButtonProps}
      ref={ref}
      id={toggleId}
      variant="ghost"
      size={size === 'xs' ? 'sm' : size}
      isIconOnly
      isDisabled={isDisabled}
      className={classNames}
      aria-label={label}
      data-disabled={isDisabled || undefined}
      onPress={isDisabled ? undefined : onPress}
    >
      {icon}
    </ToggleButton>
  ) : (
    <button
      {...buttonProps}
      ref={ref}
      type="button"
      disabled={isDisabled}
      className={classNames}
      onClick={
        isDisabled
          ? undefined
          : (event) => {
              onClick?.(event);
              onPress?.();
            }
      }
      aria-label={label}
      aria-pressed={isActive}
      aria-disabled={isDisabled || undefined}
      data-disabled={isDisabled || undefined}
    >
      {icon}
    </button>
  );

  const trigger = overlayTrigger ? cloneElement(overlayTrigger, undefined, button) : button;

  return (
    <Tooltip delay={tooltip.delay} closeDelay={tooltip.closeDelay}>
      <Tooltip.Trigger
        className={cn(styles.tooltipTrigger, tooltip.triggerClassName)}
        {...TOOLTIP_FOCUS_PASSTHROUGH_PROPS}
      >
        {trigger}
      </Tooltip.Trigger>
      <Tooltip.Content
        placement={tooltip.placement}
        offset={tooltip.offset}
        showArrow={tooltip.showArrow}
      >
        {tooltip.showArrow ? <Tooltip.Arrow /> : null}
        {tooltip.content ?? label}
      </Tooltip.Content>
    </Tooltip>
  );
}

export default AppIconButton;
export type { AppIconButtonProps, AppIconButtonTooltipOptions } from './index.type';
